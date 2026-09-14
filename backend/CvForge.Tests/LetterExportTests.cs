using System.Net;
using System.Net.Http.Json;
using CvForge.Api.Domain;
using CvForge.Api.Services.LetterExport;
using CvForge.Tests.Infrastructure;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

namespace CvForge.Tests;

[Collection("Database collection")]
public class LetterExportTests(DatabaseFixture fixture)
{
    [Theory]
    [InlineData("classique")]
    [InlineData("epure")]
    [InlineData("formel")]
    [InlineData("creatif")]
    [InlineData("ats")]
    public void LetterDocxService_Render_ProducesSchemaValidDocumentForEveryTemplate(string templateKey)
    {
        var document = SampleLetterDocument(templateKey);
        var bytes = new LetterDocxService().Render(document);

        using var stream = new MemoryStream(bytes);
        using var wordDocument = WordprocessingDocument.Open(stream, false);
        var errors = new OpenXmlValidator().Validate(wordDocument).ToList();

        Assert.True(errors.Count == 0, string.Join("\n", errors.Select(e => $"{e.Description} @ {e.Path?.XPath}")));
    }

    private static LetterDocument SampleLetterDocument(string templateKey) => new()
    {
        TemplateKey = templateKey,
        Sender = new PersonalInfo { FirstName = "Amine", LastName = "Test", Email = "a@b.com", Phone = "0600000000", City = "Paris" },
        Recipient = new RecipientInfo { RecruiterName = "Mme Dupont", CompanyName = "Acme", CompanyAddress = "1 rue Test, Paris" },
        JobTitle = "Développeur",
        City = "Paris",
        Date = "2026-09-13",
        Subject = "Candidature au poste de développeur",
        Introduction = "Introduction avec accents éàç.",
        Motivation = "Motivation.",
        Skills = "Compétences.",
        Conclusion = "Conclusion.",
    };

    [Theory]
    [InlineData("pdf", "application/pdf")]
    [InlineData("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [InlineData("txt", "text/plain")]
    [InlineData("html", "text/html")]
    [InlineData("json", "application/json")]
    public async Task Export_EachFormat_Returns200WithExpectedContentType(string format, string expectedContentType)
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var response = await client.GetAsync($"/api/letters/{created!.Id}/export/{format}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.StartsWith(expectedContentType, response.Content.Headers.ContentType!.ToString());
    }

    [Fact]
    public async Task Export_WithUnknownFormat_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var response = await client.GetAsync($"/api/letters/{created!.Id}/export/rtf");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Export_OwnedByAnotherUser_Returns404NotForbidden()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await owner.PostAsJsonAsync("/api/letters", new { })).Content.ReadFromJsonAsync<LetterSummaryDto>();

        var response = await stranger.GetAsync($"/api/letters/{created!.Id}/export/json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private record LetterSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
}
