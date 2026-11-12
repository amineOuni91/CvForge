using System.Security.Claims;
using System.Text.Json;
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

        group.MapPost("/", async (OfferDocument? document, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager, IValidator<OfferDocument> validator) =>
        {
            if (document is not null)
            {
                var validation = await validator.ValidateAsync(document);
                if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());
            }
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

        group.MapPost("/{id:guid}/cvs", async (Guid id, CreateOfferCvsRequest request, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            if (request.Items is null || request.Items.Count is 0 or > 10)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["items"] = ["1 à 10 CV attendus."] });

            var userId = userManager.GetUserId(principal)!;
            var offer = await db.LoadOwnedOfferAsync(userId, id);
            if (offer is null) return Results.NotFound();

            var copies = new List<Cv>();
            foreach (var item in request.Items)
            {
                var baseCv = await db.LoadOwnedCvAsync(userId, item.BaseCvId);
                if (baseCv is null) return Results.NotFound();

                var name = item.Name?.Trim();
                if (string.IsNullOrEmpty(name))
                    name = string.IsNullOrWhiteSpace(offer.Document.Title) ? baseCv.Name : $"{baseCv.Name} – {offer.Document.Title}";
                copies.Add(new Cv
                {
                    UserId = userId,
                    Name = name,
                    JobOfferId = id,
                    // deep copy, same as /duplicate
                    Document = JsonSerializer.Deserialize<CvDocument>(JsonSerializer.Serialize(baseCv.Document))!,
                });
            }
            db.Cvs.AddRange(copies);
            await db.SaveChangesAsync();
            return Results.Created($"/api/offers/{id}",
                copies.Select(c => new CvSummaryDto(c.Id, c.Name, c.CreatedAt, c.UpdatedAt, c.JobOfferId)).ToList());
        });

        group.MapGet("/{id:guid}/match/{cvId:guid}", async (Guid id, Guid cvId, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var offer = await db.LoadOwnedOfferAsync(userId, id);
            var cv = await db.LoadOwnedCvAsync(userId, cvId);
            return offer is null || cv is null
                ? Results.NotFound()
                : Results.Ok(AtsAnalyzer.MatchOffer(cv.Document, offer.Document.Technologies));
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

public record CreateOfferCvsRequest(List<OfferCvItem> Items);
public record OfferCvItem(Guid BaseCvId, string? Name);
public record LinkedCvDto(Guid Id, string Name, string Language, int? Score);
public record JobOfferDto(Guid Id, OfferDocument Document, DateTime CreatedAt, DateTime UpdatedAt, List<LinkedCvDto> Cvs);
