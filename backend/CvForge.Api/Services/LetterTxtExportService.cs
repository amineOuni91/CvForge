using System.Text;
using CvForge.Api.Domain;

namespace CvForge.Api.Services;

/// <summary>Plain-text cover letter rendition, independent of the 5 visual templates.</summary>
public class LetterTxtExportService
{
    public string Render(LetterDocument doc)
    {
        var lang = doc.Settings.Language;
        var sender = doc.Sender;
        var sb = new StringBuilder();

        sb.AppendLine($"{sender.FirstName} {sender.LastName}".Trim());
        sb.AppendLine(CvTextHelpers.Join(" | ", sender.Email, sender.Phone, sender.City));
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(doc.Recipient.RecruiterName)) sb.AppendLine(doc.Recipient.RecruiterName);
        if (!string.IsNullOrWhiteSpace(doc.Recipient.CompanyName)) sb.AppendLine(doc.Recipient.CompanyName);
        if (!string.IsNullOrWhiteSpace(doc.Recipient.CompanyAddress)) sb.AppendLine(doc.Recipient.CompanyAddress);
        sb.AppendLine();

        var dateLine = CvTextHelpers.Join(", ", doc.City, CvTextHelpers.FormatFullDate(doc.Date, lang));
        if (dateLine.Length > 0) sb.AppendLine(dateLine);

        if (!string.IsNullOrWhiteSpace(doc.Subject))
        {
            sb.AppendLine();
            sb.AppendLine($"{(lang == "fr" ? "Objet" : "Subject")} : {doc.Subject}");
        }
        sb.AppendLine();

        foreach (var paragraph in new[] { doc.Introduction, doc.Motivation, doc.Skills, doc.Conclusion })
        {
            if (string.IsNullOrWhiteSpace(paragraph)) continue;
            sb.AppendLine(paragraph);
            sb.AppendLine();
        }

        sb.AppendLine($"{sender.FirstName} {sender.LastName}".Trim());

        return sb.ToString();
    }
}
