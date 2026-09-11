using System.Text;
using CvForge.Api.Domain;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;

namespace CvForge.Api.Services;

/// <summary>Extracts text from an uploaded PDF/DOCX, then hands it to AiService for structuring.</summary>
public class ImportService(AiService ai)
{
    public static string ExtractTextFromPdf(Stream stream)
    {
        using var document = PdfDocument.Open(stream);
        var sb = new StringBuilder();
        foreach (var page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }
        return sb.ToString();
    }

    public static string ExtractTextFromDocx(Stream stream)
    {
        using var document = WordprocessingDocument.Open(stream, false);
        return document.MainDocumentPart?.Document?.Body?.InnerText ?? string.Empty;
    }

    public Task<CvDocument> StructureAsync(string rawText, CancellationToken ct = default) =>
        ai.StructureCvFromTextAsync(rawText, ct);
}
