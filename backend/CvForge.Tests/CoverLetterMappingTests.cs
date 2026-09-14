using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests;

[Collection("Database collection")]
public class CoverLetterMappingTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task CoverLetter_RoundTripsThroughDbContext()
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // CoverLetters.UserId has a real FK to AspNetUsers (mirrors Cv's mapping in Step 4),
        // so the owning user must exist first.
        var userId = Guid.NewGuid().ToString();
        db.Users.Add(new AppUser { Id = userId, UserName = $"{userId}@test.local", Email = $"{userId}@test.local" });
        await db.SaveChangesAsync();

        var letter = new CoverLetter { UserId = userId, Name = "Test lettre" };
        letter.Document.Sender.FirstName = "Amine";
        letter.Document.Recipient.CompanyName = "Acme";

        db.CoverLetters.Add(letter);
        await db.SaveChangesAsync();

        using var scope2 = fixture.Factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var reloaded = await db2.CoverLetters.FindAsync(letter.Id);

        Assert.NotNull(reloaded);
        Assert.Equal("Amine", reloaded!.Document.Sender.FirstName);
        Assert.Equal("Acme", reloaded.Document.Recipient.CompanyName);
    }
}
