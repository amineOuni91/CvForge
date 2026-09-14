using System.Security.Claims;
using System.Text.Json;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Endpoints;

public static class LetterEndpoints
{
    public static void MapLetterEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letters = await db.CoverLetters
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new LetterSummaryDto(l.Id, l.Name, l.CreatedAt, l.UpdatedAt))
                .ToListAsync();
            return Results.Ok(letters);
        });

        group.MapPost("/", async (CreateLetterRequest? request, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = new CoverLetter
            {
                UserId = userId,
                Name = string.IsNullOrWhiteSpace(request?.Name) ? "Nouvelle lettre" : request.Name,
                Document = request?.Document ?? new LetterDocument(),
            };
            db.CoverLetters.Add(letter);
            await db.SaveChangesAsync();
            return Results.Created($"/api/letters/{letter.Id}", new LetterSummaryDto(letter.Id, letter.Name, letter.CreatedAt, letter.UpdatedAt));
        });

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            return letter is null ? Results.NotFound() : Results.Ok(letter);
        });

        group.MapPut("/{id:guid}", async (
            Guid id,
            LetterDocument document,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager,
            IValidator<LetterDocument> validator) =>
        {
            var validation = await validator.ValidateAsync(document);
            if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            if (letter is null) return Results.NotFound();

            letter.Document = document;
            letter.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(letter);
        });

        group.MapPatch("/{id:guid}/name", async (
            Guid id,
            RenameLetterRequest request,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            if (letter is null) return Results.NotFound();

            letter.Name = request.Name;
            letter.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new LetterSummaryDto(letter.Id, letter.Name, letter.CreatedAt, letter.UpdatedAt));
        });

        group.MapPost("/{id:guid}/duplicate", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var source = await db.LoadOwnedLetterAsync(userId, id);
            if (source is null) return Results.NotFound();

            var copy = new CoverLetter
            {
                UserId = userId,
                Name = $"{source.Name} (copie)",
                Document = JsonSerializer.Deserialize<LetterDocument>(JsonSerializer.Serialize(source.Document))!,
            };
            db.CoverLetters.Add(copy);
            await db.SaveChangesAsync();
            return Results.Created($"/api/letters/{copy.Id}", new LetterSummaryDto(copy.Id, copy.Name, copy.CreatedAt, copy.UpdatedAt));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            if (letter is null) return Results.NotFound();

            db.CoverLetters.Remove(letter);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapPost("/import", async (HttpRequest request) =>
        {
            var (stream, error) = await ImportEndpoints.ReadAndValidateFileAsync(request);
            if (error is not null) return Results.BadRequest(new { error });

            await using var s = stream!;
            try
            {
                var imported = await JsonSerializer.DeserializeAsync<LetterDocument>(s);
                return imported is null
                    ? Results.BadRequest(new { error = "Fichier JSON invalide." })
                    : Results.Ok(imported);
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { error = "Fichier JSON invalide ou corrompu." });
            }
        });
    }
}

public record LetterSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
public record CreateLetterRequest(string? Name, LetterDocument? Document);
public record RenameLetterRequest(string Name);
