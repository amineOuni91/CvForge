using CvForge.Api.Domain;
using CvForge.Api.Services.LetterExport;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

namespace CvForge.Tests;

public class LetterExportTests
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
}
