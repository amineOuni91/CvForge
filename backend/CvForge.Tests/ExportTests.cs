using System.Net;
using System.Net.Http.Json;
using CvForge.Api.Domain;
using CvForge.Api.Services.DocxExport;
using CvForge.Tests.Infrastructure;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

namespace CvForge.Tests;

[Collection("Database collection")]
public class ExportTests(DatabaseFixture fixture)
{
    [Theory]
    [InlineData("pdf", "application/pdf")]
    [InlineData("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [InlineData("txt", "text/plain")]
    [InlineData("html", "text/html")]
    [InlineData("json", "application/json")]
    public async Task Export_EachFormat_Returns200WithExpectedContentType(string format, string expectedContentType)
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await client.GetAsync($"/api/cvs/{created!.Id}/export/{format}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.StartsWith(expectedContentType, response.Content.Headers.ContentType!.ToString());
    }

    [Fact]
    public async Task Export_WithUnknownFormat_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await client.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await client.GetAsync($"/api/cvs/{created!.Id}/export/rtf");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Export_OwnedByAnotherUser_Returns404NotForbidden()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var created = await (await owner.PostAsJsonAsync("/api/cvs", new { })).Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await stranger.GetAsync($"/api/cvs/{created!.Id}/export/json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("modern")]
    [InlineData("minimal")]
    [InlineData("executive")]
    [InlineData("tech")]
    [InlineData("ats")]
    public void DocxExportService_Render_ProducesSchemaValidDocumentForEveryTemplate(string templateKey)
    {
        var document = SampleCvDocument(templateKey);
        var bytes = new DocxExportService().Render(document);

        using var stream = new MemoryStream(bytes);
        using var wordDocument = WordprocessingDocument.Open(stream, false);
        var errors = new OpenXmlValidator().Validate(wordDocument).ToList();

        Assert.True(errors.Count == 0, string.Join("\n", errors.Select(e => $"{e.Description} @ {e.Path?.XPath}")));
    }

    private static CvDocument SampleCvDocument(string templateKey) => new()
    {
        TemplateKey = templateKey,
        PersonalInfo = new PersonalInfo { FirstName = "Amine", LastName = "Test", JobTitle = "Développeur", Email = "a@b.com" },
        Summary = "Résumé avec accents éàç.",
        Experiences =
        [
            new Experience
            {
                Position = "Dev", Company = "Acme", City = "Paris", StartDate = "2022-01", EndDate = "2023-01",
                Description = "Description.", Missions = ["Mission 1"], Achievements = ["Réalisation 1"], Technologies = ["C#"],
            },
        ],
        Projects = [new Project { Name = "Projet X", Description = "Un projet.", Technologies = ["Angular"] }],
        Education = [new EducationEntry { Degree = "Master", School = "ESPRIT", StartDate = "2016-01", EndDate = "2018-01" }],
        SkillCategories = [new SkillCategory { Name = "Backend", Skills = ["C#", "SQL"] }],
        Languages = [new LanguageEntry { Name = "Français", Level = "C1" }],
        Certifications = [new Certification { Name = "Cert A", Issuer = "Issuer", Date = "2020-01" }],
        Interests = ["Lecture"],
    };

    private record CvSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
}
