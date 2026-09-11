using System.Net;
using System.Net.Http.Json;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class CvCrudTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task CreateCv_ReturnsDefaultDocumentWithModernTemplate()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var response = await client.PostAsJsonAsync("/api/cvs", new { });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<CvSummaryDto>();
        Assert.Equal("Nouveau CV", summary!.Name);
    }

    [Fact]
    public async Task GetCv_AfterCreate_HasDefaultTemplateKey()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var cv = await client.GetFromJsonAsync<CvDto>($"/api/cvs/{created!.Id}");

        Assert.Equal("modern", cv!.Document.TemplateKey);
    }

    [Fact]
    public async Task UpdateCv_PersistsChanges()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();
        var cv = await client.GetFromJsonAsync<CvDto>($"/api/cvs/{created!.Id}");

        cv!.Document.TemplateKey = "minimal";
        cv.Document.PersonalInfo.FirstName = "Amine";

        var putResponse = await client.PutAsJsonAsync($"/api/cvs/{created.Id}", cv.Document);
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);

        var reloaded = await client.GetFromJsonAsync<CvDto>($"/api/cvs/{created.Id}");
        Assert.Equal("minimal", reloaded!.Document.TemplateKey);
        Assert.Equal("Amine", reloaded.Document.PersonalInfo.FirstName);
    }

    [Fact]
    public async Task UpdateCv_WithInvalidHexColor_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();
        var cv = await client.GetFromJsonAsync<CvDto>($"/api/cvs/{created!.Id}");

        cv!.Document.Settings.PrimaryColor = "not-a-color";

        var response = await client.PutAsJsonAsync($"/api/cvs/{created.Id}", cv.Document);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RenameCv_PersistsNewName()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await client.PatchAsJsonAsync($"/api/cvs/{created!.Id}/name", new { name = "CV Renamed" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var renamed = await response.Content.ReadFromJsonAsync<CvSummaryDto>();
        Assert.Equal("CV Renamed", renamed!.Name);
    }

    [Fact]
    public async Task DuplicateCv_CreatesIndependentCopy()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var dupResponse = await client.PostAsync($"/api/cvs/{created!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.Created, dupResponse.StatusCode);
        var duplicate = await dupResponse.Content.ReadFromJsonAsync<CvSummaryDto>();
        Assert.NotEqual(created.Id, duplicate!.Id);
        Assert.Contains("copie", duplicate.Name);
    }

    [Fact]
    public async Task DeleteCv_ThenGet_Returns404()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var deleteResponse = await client.DeleteAsync($"/api/cvs/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/cvs/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task ListCvs_DoesNotIncludeFullDocument()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        await client.PostAsJsonAsync("/api/cvs", new { });

        var response = await client.GetAsync("/api/cvs");
        var json = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("templateKey", json);
    }

    private record CvSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record CvDto(Guid Id, string Name, CvDocument Document, DateTime CreatedAt, DateTime UpdatedAt);
}
