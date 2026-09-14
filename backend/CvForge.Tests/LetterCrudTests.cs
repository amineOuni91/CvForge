using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class LetterCrudTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task CreateLetter_ReturnsDefaultDocumentWithClassiqueTemplate()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var response = await client.PostAsJsonAsync("/api/letters", new { });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<LetterSummaryDto>();
        Assert.Equal("Nouvelle lettre", summary!.Name);
    }

    [Fact]
    public async Task GetLetter_AfterCreate_HasDefaultTemplateKey()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var letter = await client.GetFromJsonAsync<LetterDto>($"/api/letters/{created!.Id}");

        Assert.Equal("classique", letter!.Document.TemplateKey);
    }

    [Fact]
    public async Task UpdateLetter_PersistsChanges()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();
        var letter = await client.GetFromJsonAsync<LetterDto>($"/api/letters/{created!.Id}");

        letter!.Document.TemplateKey = "epure";
        letter.Document.Sender.FirstName = "Amine";

        var putResponse = await client.PutAsJsonAsync($"/api/letters/{created.Id}", letter.Document);
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);

        var reloaded = await client.GetFromJsonAsync<LetterDto>($"/api/letters/{created.Id}");
        Assert.Equal("epure", reloaded!.Document.TemplateKey);
        Assert.Equal("Amine", reloaded.Document.Sender.FirstName);
    }

    [Fact]
    public async Task UpdateLetter_WithInvalidHexColor_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();
        var letter = await client.GetFromJsonAsync<LetterDto>($"/api/letters/{created!.Id}");

        letter!.Document.Settings.PrimaryColor = "not-a-color";

        var response = await client.PutAsJsonAsync($"/api/letters/{created.Id}", letter.Document);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RenameLetter_PersistsNewName()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var response = await client.PatchAsJsonAsync($"/api/letters/{created!.Id}/name", new { name = "Lettre Renamed" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var renamed = await response.Content.ReadFromJsonAsync<LetterSummaryDto>();
        Assert.Equal("Lettre Renamed", renamed!.Name);
    }

    [Fact]
    public async Task DuplicateLetter_CreatesIndependentCopy()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var dupResponse = await client.PostAsync($"/api/letters/{created!.Id}/duplicate", null);

        Assert.Equal(HttpStatusCode.Created, dupResponse.StatusCode);
        var duplicate = await dupResponse.Content.ReadFromJsonAsync<LetterSummaryDto>();
        Assert.NotEqual(created.Id, duplicate!.Id);
        Assert.Contains("copie", duplicate.Name);
    }

    [Fact]
    public async Task DeleteLetter_ThenGet_Returns404()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var deleteResponse = await client.DeleteAsync($"/api/letters/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/letters/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task ImportLetter_WithValidJson_ReturnsDeserializedDocument()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var json = JsonSerializer.Serialize(new LetterDocument { TemplateKey = "epure" });

        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(json)), "file", "lettre.json");
        var response = await client.PostAsync("/api/letters/import", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var imported = await response.Content.ReadFromJsonAsync<LetterDocument>();
        Assert.Equal("epure", imported!.TemplateKey);
    }

    [Fact]
    public async Task ImportLetter_WithNonJsonExtension_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent("{}"u8.ToArray()), "file", "lettre.pdf");

        var response = await client.PostAsync("/api/letters/import", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private record LetterSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record LetterDto(Guid Id, string Name, LetterDocument Document, DateTime CreatedAt, DateTime UpdatedAt);
}
