using CvForge.Api.Domain;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.LetterExport;

/// <summary>Builds a genuinely editable .docx for a cover letter, matching the active template.</summary>
public class LetterDocxService
{
    public byte[] Render(LetterDocument document)
    {
        using var stream = new MemoryStream();
        using (var wordDocument = WordprocessingDocument.Create(stream, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = wordDocument.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            var builder = document.TemplateKey switch
            {
                "epure" => new LetterDocxBuilder("Calibri Light", useColor: true, formal: false),
                "formel" => new LetterDocxBuilder("Calibri", useColor: false, formal: true),
                "creatif" => new LetterDocxBuilder("Roboto", useColor: true, formal: false),
                "ats" => new LetterDocxBuilder("Calibri", useColor: false, formal: false),
                _ => new LetterDocxBuilder("Calibri", useColor: true, formal: false),
            };
            builder.Build(body, document);

            body.AppendChild(new SectionProperties(
                new PageSize { Width = 11906, Height = 16838 },
                new PageMargin { Top = 1134, Bottom = 1134, Left = 1134, Right = 1134 }));

            mainPart.Document.Save();
        }
        return stream.ToArray();
    }
}
