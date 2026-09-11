using CvForge.Api.Domain;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.DocxExport;

/// <summary>
/// Single-column layout shared by modern/minimal/tech/ats — the four templates that don't need a
/// distinct structure (only color/font/casing vary). Executive is the only one with a real 2-column
/// layout, so it gets its own builder (<see cref="ExecutiveDocxBuilder"/>).
/// </summary>
public class SingleColumnDocxBuilder(string font, bool useColor, bool uppercaseLabels) : IDocxTemplateBuilder
{
    public void Build(Body body, CvDocument doc)
    {
        var lang = doc.Settings.CvLanguage;
        var primary = useColor ? doc.Settings.PrimaryColor : "#000000";
        var secondary = useColor ? doc.Settings.SecondaryColor : "#444444";
        var info = doc.PersonalInfo;

        body.AppendChild(DocxHelpers.Line($"{info.FirstName} {info.LastName}", font, sizeHalfPt: 40, bold: true, colorHex: primary, spacingAfter: "40"));
        body.AppendChild(DocxHelpers.Line(info.JobTitle, font, sizeHalfPt: 24, colorHex: secondary, spacingAfter: "60"));

        var contactParts = new List<string> { info.Email, info.Phone, info.City };
        if (!string.IsNullOrWhiteSpace(info.LinkedIn)) contactParts.Add(info.LinkedIn);
        if (!string.IsNullOrWhiteSpace(info.GitHub)) contactParts.Add(info.GitHub);
        body.AppendChild(DocxHelpers.Line(string.Join(" · ", contactParts.Where(p => !string.IsNullOrWhiteSpace(p))), font, sizeHalfPt: 18, colorHex: secondary, spacingAfter: "200"));

        foreach (var sectionId in doc.Settings.SectionOrder.Where(s => !doc.Settings.HiddenSections.Contains(s)))
        {
            switch (sectionId)
            {
                case "summary" when !string.IsNullOrWhiteSpace(doc.Summary):
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("summary", lang), primary, font, uppercaseLabels));
                    body.AppendChild(DocxHelpers.Line(doc.Summary, font, spacingAfter: "200"));
                    break;

                case "experiences" when doc.Experiences.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("experiences", lang), primary, font, uppercaseLabels));
                    foreach (var exp in doc.Experiences)
                        foreach (var el in DocxHelpers.ExperienceBlock(exp, lang, font, secondary))
                            body.AppendChild(el);
                    break;

                case "projects" when doc.Projects.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("projects", lang), primary, font, uppercaseLabels));
                    foreach (var project in doc.Projects)
                    {
                        body.AppendChild(DocxHelpers.Line(project.Name, font, sizeHalfPt: 22, bold: true));
                        if (!string.IsNullOrWhiteSpace(project.Description)) body.AppendChild(DocxHelpers.Line(project.Description, font, spacingAfter: "40"));
                        if (project.Technologies.Count > 0) body.AppendChild(DocxHelpers.Line(string.Join(" · ", project.Technologies), font, sizeHalfPt: 18, italic: true, colorHex: secondary, spacingAfter: "200"));
                    }
                    break;

                case "education" when doc.Education.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("education", lang), primary, font, uppercaseLabels));
                    foreach (var edu in doc.Education)
                    {
                        body.AppendChild(DocxHelpers.Line($"{edu.Degree} · {edu.School}", font, sizeHalfPt: 22, bold: true));
                        body.AppendChild(DocxHelpers.Line(edu.GraduationYear, font, sizeHalfPt: 18, italic: true, colorHex: secondary, spacingAfter: "160"));
                    }
                    break;

                case "skills" when doc.SkillCategories.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("skills", lang), primary, font, uppercaseLabels));
                    foreach (var cat in doc.SkillCategories)
                    {
                        body.AppendChild(DocxHelpers.Line(cat.Name, font, sizeHalfPt: 20, bold: true));
                        body.AppendChild(DocxHelpers.Line(string.Join(" · ", cat.Skills), font, spacingAfter: "120"));
                    }
                    break;

                case "languages" when doc.Languages.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("languages", lang), primary, font, uppercaseLabels));
                    body.AppendChild(DocxHelpers.Line(string.Join(" · ", doc.Languages.Select(l => $"{l.Name} — {l.Level}")), font, spacingAfter: "200"));
                    break;

                case "certifications" when doc.Certifications.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("certifications", lang), primary, font, uppercaseLabels));
                    foreach (var cert in doc.Certifications)
                        body.AppendChild(DocxHelpers.Line($"{cert.Name} · {cert.Issuer} ({DocxHelpers.FormatMonth(cert.Date, lang)})", font, spacingAfter: "80"));
                    break;

                case "interests" when doc.Interests.Count > 0:
                    body.AppendChild(DocxHelpers.Heading(DocxHelpers.SectionLabel("interests", lang), primary, font, uppercaseLabels));
                    body.AppendChild(DocxHelpers.Line(string.Join(" · ", doc.Interests), font, spacingAfter: "200"));
                    break;
            }
        }
    }
}
