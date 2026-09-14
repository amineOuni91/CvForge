using CvForge.Api.Domain;
using CvForge.Api.Services;
using CvForge.Api.Services.DocxExport;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.LetterExport;

/// <summary>Single letter layout, parameterized per template (font/color/formal register) —
/// a letter has no 2-column variant, so unlike the CV, one builder covers all 5 templates.</summary>
public class LetterDocxBuilder(string font, bool useColor, bool formal)
{
    public void Build(Body body, LetterDocument doc)
    {
        var lang = doc.Settings.Language;
        var primary = useColor ? doc.Settings.PrimaryColor : "#000000";
        var secondary = useColor ? doc.Settings.SecondaryColor : "#444444";
        var sender = doc.Sender;
        var recipient = doc.Recipient;

        body.AppendChild(DocxHelpers.Line($"{sender.FirstName} {sender.LastName}", font, sizeHalfPt: 24, bold: true, colorHex: primary));
        var senderContact = CvTextHelpers.Join(" · ", sender.Email, sender.Phone, sender.City);
        if (senderContact.Length > 0) body.AppendChild(DocxHelpers.Line(senderContact, font, sizeHalfPt: 18, colorHex: secondary, spacingAfter: "200"));

        if (!string.IsNullOrWhiteSpace(recipient.RecruiterName)) body.AppendChild(DocxHelpers.Line(recipient.RecruiterName, font, bold: true));
        if (!string.IsNullOrWhiteSpace(recipient.CompanyName)) body.AppendChild(DocxHelpers.Line(recipient.CompanyName, font));
        if (!string.IsNullOrWhiteSpace(recipient.CompanyAddress)) body.AppendChild(DocxHelpers.Line(recipient.CompanyAddress, font, spacingAfter: "200"));

        var dateLine = CvTextHelpers.Join(", ", doc.City, CvTextHelpers.FormatFullDate(doc.Date, lang));
        if (dateLine.Length > 0) body.AppendChild(DocxHelpers.Line(dateLine, font, colorHex: secondary, spacingAfter: "200"));

        if (!string.IsNullOrWhiteSpace(doc.Subject))
        {
            var label = lang == "fr" ? "Objet" : "Subject";
            body.AppendChild(DocxHelpers.Line($"{label} : {doc.Subject}", font, bold: true, colorHex: primary, spacingAfter: "200"));
        }

        if (formal) body.AppendChild(DocxHelpers.Line(lang == "fr" ? "Madame, Monsieur," : "Dear Sir or Madam,", font, spacingAfter: "160"));

        foreach (var paragraph in new[] { doc.Introduction, doc.Motivation, doc.Skills, doc.Conclusion })
        {
            if (string.IsNullOrWhiteSpace(paragraph)) continue;
            body.AppendChild(DocxHelpers.Line(paragraph, font, spacingAfter: "200"));
        }

        if (formal)
        {
            body.AppendChild(DocxHelpers.Line(
                lang == "fr"
                    ? "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
                    : "Sincerely,",
                font, spacingAfter: "200"));
        }

        body.AppendChild(DocxHelpers.Line($"{sender.FirstName} {sender.LastName}", font, bold: true));
    }
}
