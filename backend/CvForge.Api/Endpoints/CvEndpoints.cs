using System.Security.Claims;
using System.Text.Json;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Endpoints;

public static class CvEndpoints
{
    public static void MapCvEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cvs = await db.Cvs
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.UpdatedAt)
                .Select(c => new CvSummaryDto(c.Id, c.Name, c.CreatedAt, c.UpdatedAt))
                .ToListAsync();
            return Results.Ok(cvs);
        });

        group.MapPost("/", async (CreateCvRequest? request, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = new Cv
            {
                UserId = userId,
                Name = string.IsNullOrWhiteSpace(request?.Name) ? "Nouveau CV" : request.Name,
                Document = request?.Document ?? new CvDocument(),
            };
            db.Cvs.Add(cv);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cvs/{cv.Id}", new CvSummaryDto(cv.Id, cv.Name, cv.CreatedAt, cv.UpdatedAt));
        });

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            return cv is null ? Results.NotFound() : Results.Ok(cv);
        });

        group.MapPut("/{id:guid}", async (
            Guid id,
            CvDocument document,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager,
            IValidator<CvDocument> validator) =>
        {
            var validation = await validator.ValidateAsync(document);
            if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            if (cv is null) return Results.NotFound();

            cv.Document = document;
            cv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(cv);
        });

        group.MapPatch("/{id:guid}/name", async (
            Guid id,
            RenameCvRequest request,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            if (cv is null) return Results.NotFound();

            cv.Name = request.Name;
            cv.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new CvSummaryDto(cv.Id, cv.Name, cv.CreatedAt, cv.UpdatedAt));
        });

        group.MapPost("/{id:guid}/duplicate", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var source = await db.LoadOwnedCvAsync(userId, id);
            if (source is null) return Results.NotFound();

            var copy = new Cv
            {
                UserId = userId,
                Name = $"{source.Name} (copie)",
                // deep copy: an owned CvDocument instance can't be tracked by two Cv rows at once
                Document = JsonSerializer.Deserialize<CvDocument>(JsonSerializer.Serialize(source.Document))!,
            };
            db.Cvs.Add(copy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/cvs/{copy.Id}", new CvSummaryDto(copy.Id, copy.Name, copy.CreatedAt, copy.UpdatedAt));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            if (cv is null) return Results.NotFound();

            db.Cvs.Remove(cv);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public record CvSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
public record CreateCvRequest(string? Name, CvDocument? Document);
public record RenameCvRequest(string Name);
