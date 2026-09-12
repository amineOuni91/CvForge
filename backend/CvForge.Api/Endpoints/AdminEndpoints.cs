using System.Security.Claims;
using CvForge.Api.Data;
using CvForge.Api.Domain;
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
