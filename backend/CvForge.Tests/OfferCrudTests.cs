using System.Net;
using System.Net.Http.Json;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class OfferCrudTests(DatabaseFixture fixture)
{
    private async Task<(HttpClient, OfferDto)> CreateAsync()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var response = await client.PostAsJsonAsync("/api/offers", new { });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (client, (await response.Content.ReadFromJsonAsync<OfferDto>())!);
    }

    [Fact]
    public async Task CreateOffer_ReturnsDefaultsAndEmptyCvs()
    {
        var (_, offer) = await CreateAsync();
        Assert.Equal("toApply", offer.Document.Status);
        Assert.Empty(offer.Cvs);
    }

    [Fact]
    public async Task UpdateOffer_PersistsFieldsAndSteps()
    {
        var (client, offer) = await CreateAsync();
        var doc = offer.Document;
        doc.Title = "Dev .NET";
        doc.Technologies = ["C#", "Angular"];
        doc.Steps = [new OfferStep { Type = "hrInterview", Date = "2026-11-18T10:00", NoteAfter = "Bien passé" }];

        var put = await client.PutAsJsonAsync($"/api/offers/{offer.Id}", doc);
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var got = await client.GetFromJsonAsync<OfferDto>($"/api/offers/{offer.Id}");
        Assert.Equal("Dev .NET", got!.Document.Title);
        Assert.Equal(["C#", "Angular"], got.Document.Technologies);
        var step = Assert.Single(got.Document.Steps);
        Assert.Equal("hrInterview", step.Type);
        Assert.Equal("2026-11-18T10:00", step.Date);
        Assert.Equal("Bien passé", step.NoteAfter);
    }

    private async Task AssertPutReturns400(Action<OfferDocument> mutate)
    {
        var (client, offer) = await CreateAsync();
        mutate(offer.Document);
        var put = await client.PutAsJsonAsync($"/api/offers/{offer.Id}", offer.Document);
        Assert.Equal(HttpStatusCode.BadRequest, put.StatusCode);
    }

    [Fact]
    public Task UpdateOffer_NullTechnologies_Returns400() => AssertPutReturns400(d => d.Technologies = null!);

    [Fact]
    public Task UpdateOffer_InvalidStatus_Returns400() => AssertPutReturns400(d => d.Status = "nope");

    [Fact]
    public Task UpdateOffer_InvalidStepType_Returns400() => AssertPutReturns400(d => d.Steps = [new OfferStep { Type = "nope" }]);

    [Fact]
    public Task UpdateOffer_NonHttpUrl_Returns400() => AssertPutReturns400(d => d.Url = "javascript:alert(1)");

    [Fact]
    public Task UpdateOffer_BadStepDate_Returns400() => AssertPutReturns400(d => d.Steps = [new OfferStep { Date = "18/11/2026" }]);

    [Fact]
    public async Task ListOffers_NewestFirst()
    {
        var (client, first) = await CreateAsync();
        var second = await (await client.PostAsJsonAsync("/api/offers", new { })).Content.ReadFromJsonAsync<OfferDto>();
        first.Document.Title = "touched";
        await client.PutAsJsonAsync($"/api/offers/{first.Id}", first.Document);

        var list = await client.GetFromJsonAsync<List<OfferDto>>("/api/offers");

        Assert.Equal([first.Id, second!.Id], list!.Select(o => o.Id));
    }

    private record LinkedCv(Guid Id, string Name, string Language, int? Score);
    private record OfferDto(Guid Id, OfferDocument Document, DateTime CreatedAt, DateTime UpdatedAt, List<LinkedCv> Cvs);
}
