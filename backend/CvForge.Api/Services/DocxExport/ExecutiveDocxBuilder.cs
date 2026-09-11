using CvForge.Api.Domain;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.DocxExport;

/// <summary>The only template with a real 2-column layout (dark header bar + light sidebar),
/// built as a genuine Word table so it stays editable — mirrors executive-template.component.ts.</summary>
public class ExecutiveDocxBuilder : IDocxTemplateBuilder
{
    private const string Font = "Calibri";
    private static readonly string[] SidebarSections = ["skills", "languages", "certifications", "interests"];
    private static readonly string[] MainSections = ["summary", "experiences", "projects", "education"];

    public void Build(Body body, CvDocument doc)
    {
        var lang = doc.Settings.CvLanguage;
        var primary = doc.Settings.PrimaryColor;
        var secondary = doc.Settings.SecondaryColor;
        var info = doc.PersonalInfo;

        body.AppendChild(HeaderBar($"{info.FirstName} {info.LastName}", primary, bold: true, size: 40));
        body.AppendChild(HeaderBar(info.JobTitle, primary, bold: false, size: 22));
        body.AppendChild(new Paragraph(new ParagraphProperties(new SpacingBetweenLines { After = "200" })));

        var table = new Table(
            new TableProperties(
                new TableWidth { Type = TableWidthUnitValues.Dxa, Width = "10546" },
                new TableBorders(
                    new TopBorder { Val = BorderValues.None },
                    new LeftBorder { Val = BorderValues.None },
                    new BottomBorder { Val = BorderValues.None },
                    new RightBorder { Val = BorderValues.None },
                    new InsideHorizontalBorder { Val = BorderValues.None },
                    new InsideVerticalBorder { Val = BorderValues.None })),
            new TableGrid(new GridColumn { Width = "3691" }, new GridColumn { Width = "6855" }));

        var row = new TableRow();
        row.AppendChild(Cell(3691, "F8FAFC", SidebarContent(doc, lang, secondary)));
        row.AppendChild(Cell(6855, null, MainContent(doc, lang, primary, secondary)));
        table.AppendChild(row);

        body.AppendChild(table);
        body.AppendChild(new Paragraph());
    }

    private static Paragraph HeaderBar(string text, string colorHex, bool bold, int size)
    {
        var pPr = new ParagraphProperties(
            new Shading { Val = ShadingPatternValues.Clear, Fill = DocxHelpers.HexColor(colorHex) },
            new SpacingBetweenLines { After = "0" });
        // Schema order inside <w:rPr> is rFonts, b, color, sz — Bold must be added before Color, not appended after.
        var runChildren = new List<OpenXmlElement> { new RunFonts { Ascii = Font, HighAnsi = Font } };
        if (bold) runChildren.Add(new Bold());
        runChildren.Add(new Color { Val = "FFFFFF" });
        runChildren.Add(new FontSize { Val = size.ToString() });
        return new Paragraph(pPr, new Run(new RunProperties(runChildren), new Text(text)));
    }

    private static TableCell Cell(int widthTwips, string? fillHex, IEnumerable<OpenXmlElement> content)
    {
        var cellProps = new TableCellProperties(new TableCellWidth { Type = TableWidthUnitValues.Dxa, Width = widthTwips.ToString() });
        if (fillHex is not null) cellProps.Shading = new Shading { Val = ShadingPatternValues.Clear, Fill = fillHex };
        var cell = new TableCell(cellProps);
        foreach (var el in content) cell.AppendChild(el);
        if (!cell.Elements<Paragraph>().Any()) cell.AppendChild(new Paragraph());
        return cell;
    }

    private static IEnumerable<OpenXmlElement> SidebarContent(CvDocument doc, string lang, string secondary)
    {
        var info = doc.PersonalInfo;
        yield return DocxHelpers.Line(info.Email, Font, sizeHalfPt: 18, spacingAfter: "40");
        yield return DocxHelpers.Line(info.Phone, Font, sizeHalfPt: 18, spacingAfter: "40");
        yield return DocxHelpers.Line(CvTextHelpers.Join(", ", info.City, info.Country), Font, sizeHalfPt: 18, spacingAfter: "40");
        if (!string.IsNullOrWhiteSpace(info.LinkedIn)) yield return DocxHelpers.Line(info.LinkedIn, Font, sizeHalfPt: 18, spacingAfter: "40");
        if (!string.IsNullOrWhiteSpace(info.GitHub)) yield return DocxHelpers.Line(info.GitHub, Font, sizeHalfPt: 18, spacingAfter: "200");

        foreach (var sectionId in SidebarSections.Where(s => doc.Settings.SectionOrder.Contains(s) && !doc.Settings.HiddenSections.Contains(s)))
        {
            switch (sectionId)
            {
                case "skills" when doc.SkillCategories.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("skills", lang), doc.Settings.PrimaryColor, Font, underline: false);
                    foreach (var cat in doc.SkillCategories)
                    {
                        yield return DocxHelpers.Line(cat.Name, Font, sizeHalfPt: 18, bold: true);
                        yield return DocxHelpers.Line(string.Join(", ", cat.Skills), Font, sizeHalfPt: 18, spacingAfter: "100");
                    }
                    break;
                case "languages" when doc.Languages.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("languages", lang), doc.Settings.PrimaryColor, Font, underline: false);
                    foreach (var l in doc.Languages) yield return DocxHelpers.Line(CvTextHelpers.Join(" — ", l.Name, l.Level), Font, sizeHalfPt: 18, spacingAfter: "40");
                    break;
                case "certifications" when doc.Certifications.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("certifications", lang), doc.Settings.PrimaryColor, Font, underline: false);
                    foreach (var c in doc.Certifications) yield return DocxHelpers.Line(c.Name, Font, sizeHalfPt: 18, spacingAfter: "40");
                    break;
                case "interests" when doc.Interests.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("interests", lang), doc.Settings.PrimaryColor, Font, underline: false);
                    yield return DocxHelpers.Line(string.Join(", ", doc.Interests), Font, sizeHalfPt: 18, spacingAfter: "100");
                    break;
            }
        }
    }

    private static IEnumerable<OpenXmlElement> MainContent(CvDocument doc, string lang, string primary, string secondary)
    {
        foreach (var sectionId in MainSections.Where(s => doc.Settings.SectionOrder.Contains(s) && !doc.Settings.HiddenSections.Contains(s)))
        {
            switch (sectionId)
            {
                case "summary" when !string.IsNullOrWhiteSpace(doc.Summary):
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("summary", lang), primary, Font);
                    yield return DocxHelpers.Line(doc.Summary, Font, spacingAfter: "200");
                    break;
                case "experiences" when doc.Experiences.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("experiences", lang), primary, Font);
                    foreach (var exp in doc.Experiences)
                        foreach (var el in DocxHelpers.ExperienceBlock(exp, lang, Font, secondary))
                            yield return el;
                    break;
                case "projects" when doc.Projects.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("projects", lang), primary, Font);
                    foreach (var project in doc.Projects)
                    {
                        var projectTitle = string.IsNullOrWhiteSpace(project.Role) ? project.Name : $"{project.Name} · {project.Role}";
                        yield return DocxHelpers.Line(projectTitle, Font, sizeHalfPt: 22, bold: true);
                        var projectMeta = CvTextHelpers.Join(" · ", CvTextHelpers.FormatMonth(project.Date, lang), project.Url);
                        if (projectMeta.Length > 0) yield return DocxHelpers.Line(projectMeta, Font, sizeHalfPt: 18, italic: true, colorHex: secondary);
                        if (!string.IsNullOrWhiteSpace(project.Description)) yield return DocxHelpers.Line(project.Description, Font, spacingAfter: "200");
                    }
                    break;
                case "education" when doc.Education.Count > 0:
                    yield return DocxHelpers.Heading(DocxHelpers.SectionLabel("education", lang), primary, Font);
                    foreach (var edu in doc.Education)
                    {
                        yield return DocxHelpers.Line(CvTextHelpers.Join(" · ", edu.Degree, edu.School), Font, sizeHalfPt: 22, bold: true);
                        yield return DocxHelpers.Line(edu.GraduationYear, Font, sizeHalfPt: 18, italic: true, colorHex: secondary, spacingAfter: "160");
                    }
                    break;
            }
        }
    }
}
