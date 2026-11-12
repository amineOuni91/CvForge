using System.Security.Claims;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Endpoints;

public static class OfferEndpoints
{
    public static void MapOfferEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var offers = await db.JobOffers.Where(o => o.UserId == userId).OrderByDescending(o => o.UpdatedAt).ToListAsync();
            var cvs = await db.Cvs.Where(c => c.UserId == userId && c.JobOfferId != null).ToListAsync();
            var byOffer = cvs.GroupBy(c => c.JobOfferId!.Value).ToDictionary(g => g.Key, g => g.ToList());
            return Results.Ok(offers.Select(o => ToDto(o, byOffer.GetValueOrDefault(o.Id) ?? [])).ToList());
        });

        group.MapPost("/", async (OfferDocument? document, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var offer = new JobOffer { UserId = userManager.GetUserId(principal)!, Document = document ?? new OfferDocument() };
            db.JobOffers.Add(offer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/offers/{offer.Id}", ToDto(offer, []));
        });

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var offer = await db.LoadOwnedOfferAsync(userId, id);
            return offer is null ? Results.NotFound() : Results.Ok(await ToDtoAsync(db, offer));
        });

        group.MapPut("/{id:guid}", async (
            Guid id,
            OfferDocument document,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager,
            IValidator<OfferDocument> validator) =>
        {
            var validation = await validator.ValidateAsync(document);
            if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

            var userId = userManager.GetUserId(principal)!;
            var offer = await db.LoadOwnedOfferAsync(userId, id);
            if (offer is null) return Results.NotFound();

            offer.Document = document;
            offer.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(await ToDtoAsync(db, offer));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var offer = await db.LoadOwnedOfferAsync(userId, id);
            if (offer is null) return Results.NotFound();

            // FK is NoAction (SQL Server rejects SET NULL here): detach the CVs ourselves, atomically.
            await using var tx = await db.Database.BeginTransactionAsync();
            await db.Cvs.Where(c => c.JobOfferId == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.JobOfferId, (Guid?)null));
            db.JobOffers.Remove(offer);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Results.NoContent();
        });
    }

    internal static async Task<JobOfferDto> ToDtoAsync(AppDbContext db, JobOffer offer)
    {
        var cvs = await db.Cvs.Where(c => c.UserId == offer.UserId && c.JobOfferId == offer.Id).ToListAsync();
        return ToDto(offer, cvs);
    }

    internal static JobOfferDto ToDto(JobOffer offer, List<Cv> cvs) => new(
        offer.Id, offer.Document, offer.CreatedAt, offer.UpdatedAt,
        cvs.OrderByDescending(c => c.UpdatedAt)
           .Select(c => new LinkedCvDto(c.Id, c.Name, c.Document.Settings.CvLanguage,
               AtsAnalyzer.MatchOffer(c.Document, offer.Document.Technologies).Score))
           .ToList());
}

public record LinkedCvDto(Guid Id, string Name, string Language, int? Score);
public record JobOfferDto(Guid Id, OfferDocument Document, DateTime CreatedAt, DateTime UpdatedAt, List<LinkedCvDto> Cvs);
