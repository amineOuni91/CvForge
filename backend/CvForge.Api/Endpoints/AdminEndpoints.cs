using System.Security.Claims;
using System.Text.Json;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using CvForge.Api.Services.DocxExport;
using CvForge.Api.Services.LetterExport;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Endpoints;

public static class AdminEndpoints
{
    private const string AdminRole = "Admin";

    public static void MapAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/users", async (ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var callerId = userManager.GetUserId(principal)!;
            var cvCounts = await db.Cvs
                .GroupBy(c => c.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.UserId, g => g.Count);

            var users = new List<AdminUserDto>();
            foreach (var user in userManager.Users.Where(u => u.Id != callerId).ToList())
                users.Add(new AdminUserDto(user.Id, user.Email!, user.DisplayName, user.EmailConfirmed, await RoleNameAsync(userManager, user), cvCounts.GetValueOrDefault(user.Id)));
            return Results.Ok(users);
        });

        group.MapPost("/users", async (CreateAdminUserRequest request, UserManager<AppUser> userManager) =>
        {
            var user = new AppUser { UserName = request.Email, Email = request.Email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                return Results.BadRequest(new { error = string.Join(" ", result.Errors.Select(e => e.Description)) });

            if (IsAdminRole(request.Role))
                await userManager.AddToRoleAsync(user, AdminRole);

            return Results.Created($"/api/admin/users/{user.Id}", new AdminUserDto(user.Id, user.Email!, user.DisplayName, user.EmailConfirmed, await RoleNameAsync(userManager, user), CvCount: 0));
        });

        group.MapGet("/users/{id}", async (string id, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();
            return Results.Ok(new AdminUserDetailDto(user.Id, user.Email!, user.DisplayName, user.ProfileInfo, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
        });

        group.MapPatch("/users/{id}", async (string id, UpdateAdminUserRequest request, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await userManager.FindByEmailAsync(request.Email);
                if (existing is not null && existing.Id != user.Id)
                    return Results.BadRequest(new { error = "Cet email est déjà utilisé par un autre compte." });

                await userManager.SetEmailAsync(user, request.Email);
                await userManager.SetUserNameAsync(user, request.Email);
            }

            user.DisplayName = request.DisplayName;
            user.ProfileInfo = request.PersonalInfo;
            await userManager.UpdateAsync(user);

            var wantsAdmin = IsAdminRole(request.Role);
            var isAdmin = await userManager.IsInRoleAsync(user, AdminRole);
            if (wantsAdmin && !isAdmin) await userManager.AddToRoleAsync(user, AdminRole);
            if (!wantsAdmin && isAdmin) await userManager.RemoveFromRoleAsync(user, AdminRole);

            return Results.Ok(new AdminUserDetailDto(user.Id, user.Email!, user.DisplayName, user.ProfileInfo, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
        });

        group.MapPost("/users/{id}/reset-password", async (string id, AdminResetPasswordRequest request, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            await userManager.RemovePasswordAsync(user);
            var result = await userManager.AddPasswordAsync(user, request.NewPassword);
            return result.Succeeded
                ? Results.Ok()
                : Results.BadRequest(new { error = string.Join(" ", result.Errors.Select(e => e.Description)) });
        });

        group.MapPost("/users/{id}/activate", async (string id, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            user.EmailConfirmed = true;
            await userManager.UpdateAsync(user);
            return Results.Ok();
        });

        group.MapPost("/users/{id}/deactivate", async (string id, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            user.EmailConfirmed = false;
            await userManager.UpdateAsync(user);
            return Results.Ok();
        });

        group.MapDelete("/users/{id}", async (string id, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var callerId = userManager.GetUserId(principal)!;
            if (id == callerId)
                return Results.BadRequest(new { error = "Impossible de supprimer son propre compte depuis cette interface." });

            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            var result = await userManager.DeleteAsync(user);
            return result.Succeeded ? Results.Ok() : Results.BadRequest(new { error = "Échec de la suppression du compte." });
        });

        group.MapGet("/users/{id}/cvs", async (string id, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            var cvs = await db.Cvs
                .Where(c => c.UserId == id)
                .OrderByDescending(c => c.UpdatedAt)
                .Select(c => new CvSummaryDto(c.Id, c.Name, c.CreatedAt, c.UpdatedAt))
                .ToListAsync();
            return Results.Ok(cvs);
        });

        group.MapGet("/users/{id}/cvs/{cvId:guid}", async (string id, Guid cvId, AppDbContext db) =>
        {
            var cv = await db.LoadOwnedCvAsync(id, cvId);
            return cv is null ? Results.NotFound() : Results.Ok(cv);
        });

        group.MapPatch("/users/{id}/cvs/{cvId:guid}/name", async (string id, Guid cvId, RenameCvRequest request, AppDbContext db) =>
        {
            var cv = await db.LoadOwnedCvAsync(id, cvId);
            if (cv is null) return Results.NotFound();

            cv.Name = request.Name;
            cv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new CvSummaryDto(cv.Id, cv.Name, cv.CreatedAt, cv.UpdatedAt));
        });

        group.MapPost("/users/{id}/cvs/{cvId:guid}/duplicate", async (string id, Guid cvId, AppDbContext db) =>
        {
            var source = await db.LoadOwnedCvAsync(id, cvId);
            if (source is null) return Results.NotFound();

            var copy = new Cv
            {
                UserId = id,
                Name = $"{source.Name} (copie)",
                Document = JsonSerializer.Deserialize<CvDocument>(JsonSerializer.Serialize(source.Document))!,
            };
            db.Cvs.Add(copy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/users/{id}/cvs/{copy.Id}", new CvSummaryDto(copy.Id, copy.Name, copy.CreatedAt, copy.UpdatedAt));
        });

        group.MapGet("/users/{id}/cvs/{cvId:guid}/export/{format}", async (
            string id,
            Guid cvId,
            string format,
            AppDbContext db,
            PdfService pdfService,
            DocxExportService docxExportService,
            TxtExportService txtExportService) =>
        {
            var cv = await db.LoadOwnedCvAsync(id, cvId);
            if (cv is null) return Results.NotFound();

            return await ExportEndpoints.RenderExportAsync(cv, format, pdfService, docxExportService, txtExportService);
        });

        group.MapPut("/users/{id}/cvs/{cvId:guid}", async (
            string id,
            Guid cvId,
            CvDocument document,
            AppDbContext db,
            IValidator<CvDocument> validator) =>
        {
            var validation = await validator.ValidateAsync(document);
            if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

            var cv = await db.LoadOwnedCvAsync(id, cvId);
            if (cv is null) return Results.NotFound();

            cv.Document = document;
            cv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(cv);
        });

        group.MapDelete("/users/{id}/cvs/{cvId:guid}", async (string id, Guid cvId, AppDbContext db) =>
        {
            var cv = await db.LoadOwnedCvAsync(id, cvId);
            if (cv is null) return Results.NotFound();

            db.Cvs.Remove(cv);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapGet("/users/{id}/letters", async (string id, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            var letters = await db.CoverLetters
                .Where(l => l.UserId == id)
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new LetterSummaryDto(l.Id, l.Name, l.CreatedAt, l.UpdatedAt))
                .ToListAsync();
            return Results.Ok(letters);
        });

        group.MapGet("/users/{id}/letters/{letterId:guid}", async (string id, Guid letterId, AppDbContext db) =>
        {
            var letter = await db.LoadOwnedLetterAsync(id, letterId);
            return letter is null ? Results.NotFound() : Results.Ok(letter);
        });

        group.MapPatch("/users/{id}/letters/{letterId:guid}/name", async (string id, Guid letterId, RenameLetterRequest request, AppDbContext db) =>
        {
            var letter = await db.LoadOwnedLetterAsync(id, letterId);
            if (letter is null) return Results.NotFound();

            letter.Name = request.Name;
            letter.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new LetterSummaryDto(letter.Id, letter.Name, letter.CreatedAt, letter.UpdatedAt));
        });

        group.MapPost("/users/{id}/letters/{letterId:guid}/duplicate", async (string id, Guid letterId, AppDbContext db) =>
        {
            var source = await db.LoadOwnedLetterAsync(id, letterId);
            if (source is null) return Results.NotFound();

            var copy = new CoverLetter
            {
                UserId = id,
                Name = $"{source.Name} (copie)",
                Document = JsonSerializer.Deserialize<LetterDocument>(JsonSerializer.Serialize(source.Document))!,
            };
            db.CoverLetters.Add(copy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/users/{id}/letters/{copy.Id}", new LetterSummaryDto(copy.Id, copy.Name, copy.CreatedAt, copy.UpdatedAt));
        });

        group.MapGet("/users/{id}/letters/{letterId:guid}/export/{format}", async (
            string id,
            Guid letterId,
            string format,
            AppDbContext db,
            PdfService pdfService,
            LetterDocxService letterDocxService,
            LetterTxtExportService letterTxtExportService) =>
        {
            var letter = await db.LoadOwnedLetterAsync(id, letterId);
            if (letter is null) return Results.NotFound();

            return await LetterExportEndpoints.RenderLetterExportAsync(letter, format, pdfService, letterDocxService, letterTxtExportService);
        });

        group.MapPut("/users/{id}/letters/{letterId:guid}", async (
            string id,
            Guid letterId,
            LetterDocument document,
            AppDbContext db,
            IValidator<LetterDocument> validator) =>
        {
            var validation = await validator.ValidateAsync(document);
            if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

            var letter = await db.LoadOwnedLetterAsync(id, letterId);
            if (letter is null) return Results.NotFound();

            letter.Document = document;
            letter.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(letter);
        });

        group.MapDelete("/users/{id}/letters/{letterId:guid}", async (string id, Guid letterId, AppDbContext db) =>
        {
            var letter = await db.LoadOwnedLetterAsync(id, letterId);
            if (letter is null) return Results.NotFound();

            db.CoverLetters.Remove(letter);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static bool IsAdminRole(string? role) => string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);

    private static async Task<string> RoleNameAsync(UserManager<AppUser> userManager, AppUser user) =>
        await userManager.IsInRoleAsync(user, AdminRole) ? "admin" : "visitor";
}

public record AdminUserDto(string Id, string Email, string DisplayName, bool EmailConfirmed, string Role, int CvCount);
public record AdminUserDetailDto(string Id, string Email, string DisplayName, PersonalInfo ProfileInfo, bool EmailConfirmed, string Role);
public record CreateAdminUserRequest(string Email, string Password, string Role);
public record UpdateAdminUserRequest(string DisplayName, PersonalInfo PersonalInfo, string Email, string Role);
public record AdminResetPasswordRequest(string NewPassword);
