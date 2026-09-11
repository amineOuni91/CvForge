using CvForge.Api.Services;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.DocxExport;

/// <summary>Shared OOXML building blocks reused by every DOCX template builder — mirrors the role
/// cv-base.css/font-stacks.ts play for the 5 HTML templates. Labels/dates come from <see cref="CvTextHelpers"/>,
/// shared with the TXT exporter.</summary>
public static class DocxHelpers
{
    public static string SectionLabel(string sectionId, string lang) => CvTextHelpers.SectionLabel(sectionId, lang);
    public static string MissionsLabel(string lang) => CvTextHelpers.MissionsLabel(lang);
    public static string AchievementsLabel(string lang) => CvTextHelpers.AchievementsLabel(lang);
    public static string PresentLabel(string lang) => CvTextHelpers.PresentLabel(lang);
    public static string FormatMonth(string? value, string lang) => CvTextHelpers.FormatMonth(value, lang);

    public static string HexColor(string? hex) =>
        string.IsNullOrWhiteSpace(hex) ? "000000" : hex.TrimStart('#');

    public static Paragraph Heading(string text, string colorHex, string font, bool uppercase = false, bool underline = true)
    {
        var runProps = new RunProperties(
            new RunFonts { Ascii = font, HighAnsi = font },
            new Bold(),
            new Color { Val = HexColor(colorHex) },
            new FontSize { Val = "24" });
        var pPr = new ParagraphProperties
        {
            SpacingBetweenLines = new SpacingBetweenLines { Before = "240", After = "100" },
        };
        if (underline)
        {
            pPr.ParagraphBorders = new ParagraphBorders(
                new BottomBorder { Val = BorderValues.Single, Color = HexColor(colorHex), Size = 8, Space = 4 });
        }
        return new Paragraph(pPr, new Run(runProps, new Text(uppercase ? text.ToUpperInvariant() : text)));
    }

    public static Paragraph Line(
        string text, string font, int sizeHalfPt = 20, bool bold = false, bool italic = false, string? colorHex = null, string? spacingAfter = null)
    {
        // OOXML enforces a strict child-element order inside <w:rPr> (rFonts, b, i, color, sz, ...) —
        // AppendChild after construction does NOT reorder, so every child must be added in schema order up front.
        var children = new List<OpenXmlElement> { new RunFonts { Ascii = font, HighAnsi = font } };
        if (bold) children.Add(new Bold());
        if (italic) children.Add(new Italic());
        if (colorHex is not null) children.Add(new Color { Val = HexColor(colorHex) });
        children.Add(new FontSize { Val = sizeHalfPt.ToString() });
        var runProps = new RunProperties(children);

        var paragraph = new Paragraph(new Run(runProps, new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        if (spacingAfter is not null)
        {
            paragraph.ParagraphProperties = new ParagraphProperties(new SpacingBetweenLines { After = spacingAfter });
        }
        return paragraph;
    }

    public static Paragraph Bullet(string text, string font, int sizeHalfPt = 20)
    {
        var pPr = new ParagraphProperties(new Indentation { Left = "360" });
        var run = new Run(new RunProperties(new RunFonts { Ascii = font, HighAnsi = font }, new FontSize { Val = sizeHalfPt.ToString() }), new Text($"•\t{text}"));
        return new Paragraph(pPr, run);
    }

    /// <summary>One experience entry: title/company, dates, description, missions/achievements, technologies.</summary>
    public static IEnumerable<OpenXmlElement> ExperienceBlock(Domain.Experience exp, string lang, string font, string secondaryColor)
    {
        yield return Line($"{exp.Position} · {exp.Company}", font, sizeHalfPt: 22, bold: true);

        var end = exp.IsCurrent ? PresentLabel(lang) : FormatMonth(exp.EndDate, lang);
        yield return Line($"{FormatMonth(exp.StartDate, lang)} → {end} · {exp.City}", font, sizeHalfPt: 18, italic: true, colorHex: secondaryColor, spacingAfter: "80");

        if (!string.IsNullOrWhiteSpace(exp.Description))
        {
            yield return Line(exp.Description, font, spacingAfter: "60");
        }

        if (exp.Missions.Count > 0)
        {
            yield return Line(MissionsLabel(lang), font, sizeHalfPt: 18, bold: true, colorHex: secondaryColor);
            foreach (var mission in exp.Missions) yield return Bullet(mission, font);
        }

        if (exp.Achievements.Count > 0)
        {
            yield return Line(AchievementsLabel(lang), font, sizeHalfPt: 18, bold: true, colorHex: secondaryColor);
            foreach (var achievement in exp.Achievements) yield return Bullet(achievement, font);
        }

        if (exp.Technologies.Count > 0)
        {
            yield return Line(string.Join(" · ", exp.Technologies), font, sizeHalfPt: 18, italic: true, colorHex: secondaryColor, spacingAfter: "200");
        }
    }
}
