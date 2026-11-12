using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests;

[Collection("Database collection")]
public class JobOfferMappingTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task JobOffer_WithSteps_RoundTripsAndLinksCv()
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userId = Guid.NewGuid().ToString();
        db.Users.Add(new AppUser { Id = userId, UserName = $"{userId}@test.local", Email = $"{userId}@test.local" });
        await db.SaveChangesAsync();

        var offer = new JobOffer { UserId = userId };
        offer.Document.Title = "Tech Lead";
        offer.Document.Technologies = [".NET", "Kafka"];
        offer.Document.Steps =
        [
            new OfferStep { Type = "hrInterview", Date = "2026-11-18T10:00", NoteBefore = "Préparer" },
            new OfferStep { Type = "techInterview", Date = null },
        ];
        var cv = new Cv { UserId = userId, JobOfferId = offer.Id };
        db.JobOffers.Add(offer);
        db.Cvs.Add(cv);
        await db.SaveChangesAsync();

        using var scope2 = fixture.Factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var reloaded = await db2.LoadOwnedOfferAsync(userId, offer.Id);
        var reloadedCv = await db2.LoadOwnedCvAsync(userId, cv.Id);

        Assert.NotNull(reloaded);
        Assert.Equal("Tech Lead", reloaded!.Document.Title);
        Assert.Equal(2, reloaded.Document.Technologies.Count);
        Assert.Equal(2, reloaded.Document.Steps.Count);
        Assert.Equal("2026-11-18T10:00", reloaded.Document.Steps[0].Date);
        Assert.Equal("Préparer", reloaded.Document.Steps[0].NoteBefore);
        Assert.Null(reloaded.Document.Steps[1].Date);
        Assert.Equal(offer.Id, reloadedCv!.JobOfferId);
    }
}
