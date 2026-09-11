using CvForge.Api.Domain;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.DocxExport;

/// <summary>Builds a genuinely editable .docx (native Word paragraphs/tables, not a PDF conversion)
/// matching the CV's active template — <see cref="SingleColumnDocxBuilder"/> for modern/minimal/tech/ats,
/// <see cref="ExecutiveDocxBuilder"/> for the one 2-column layout.</summary>
public class DocxExportService
{
    public byte[] Render(CvDocument document)
    {
        using var stream = new MemoryStream();
        using (var wordDocument = WordprocessingDocument.Create(stream, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            var mainPart = wordDocument.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            IDocxTemplateBuilder builder = document.TemplateKey switch
            {
                "minimal" => new SingleColumnDocxBuilder("Calibri Light", useColor: true, uppercaseLabels: false),
                "tech" => new SingleColumnDocxBuilder("Consolas", useColor: true, uppercaseLabels: true),
                "ats" => new SingleColumnDocxBuilder("Calibri", useColor: false, uppercaseLabels: false),
                "executive" => new ExecutiveDocxBuilder(),
                _ => new SingleColumnDocxBuilder("Calibri", useColor: true, uppercaseLabels: true),
            };
            builder.Build(body, document);

            body.AppendChild(new SectionProperties(
                new PageSize { Width = 11906, Height = 16838 },
                new PageMargin { Top = 680, Bottom = 680, Left = 680, Right = 680 }));

            mainPart.Document.Save();
        }
        return stream.ToArray();
    }
}
