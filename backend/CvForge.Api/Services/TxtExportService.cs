using System.Text;
using CvForge.Api.Domain;

namespace CvForge.Api.Services;

/// <summary>Plain-text CV rendition, independent of the 5 visual templates — same content, no markup.</summary>
public class TxtExportService
{
    public string Render(CvDocument doc)
    {
        var lang = doc.Settings.CvLanguage;
        var info = doc.PersonalInfo;
        var sb = new StringBuilder();

        sb.AppendLine($"{info.FirstName} {info.LastName}".Trim());
        if (!string.IsNullOrWhiteSpace(info.JobTitle)) sb.AppendLine(info.JobTitle);
        sb.AppendLine(string.Join(" | ", new[] { info.Email, info.Phone, info.City, info.LinkedIn, info.GitHub }.Where(v => !string.IsNullOrWhiteSpace(v))));
        sb.AppendLine();

        foreach (var sectionId in doc.Settings.SectionOrder.Where(s => !doc.Settings.HiddenSections.Contains(s)))
        {
            switch (sectionId)
            {
                case "summary" when !string.IsNullOrWhiteSpace(doc.Summary):
                    Section(sb, CvTextHelpers.SectionLabel("summary", lang));
                    sb.AppendLine(doc.Summary);
                    sb.AppendLine();
                    break;

                case "experiences" when doc.Experiences.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("experiences", lang));
                    foreach (var exp in doc.Experiences)
                    {
                        var end = exp.IsCurrent ? CvTextHelpers.PresentLabel(lang) : CvTextHelpers.FormatMonth(exp.EndDate, lang);
                        sb.AppendLine($"{exp.Position} - {exp.Company}");
                        sb.AppendLine($"{CvTextHelpers.FormatMonth(exp.StartDate, lang)} -> {end} - {exp.City}");
                        if (!string.IsNullOrWhiteSpace(exp.Description)) sb.AppendLine(exp.Description);
                        if (exp.Missions.Count > 0)
                        {
                            sb.AppendLine($"{CvTextHelpers.MissionsLabel(lang)}:");
                            foreach (var m in exp.Missions) sb.AppendLine($"  - {m}");
                        }
                        if (exp.Achievements.Count > 0)
                        {
                            sb.AppendLine($"{CvTextHelpers.AchievementsLabel(lang)}:");
                            foreach (var a in exp.Achievements) sb.AppendLine($"  - {a}");
                        }
                        if (exp.Technologies.Count > 0) sb.AppendLine($"Technologies: {string.Join(", ", exp.Technologies)}");
                        sb.AppendLine();
                    }
                    break;

                case "projects" when doc.Projects.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("projects", lang));
                    foreach (var p in doc.Projects)
                    {
                        sb.AppendLine(p.Name);
                        if (!string.IsNullOrWhiteSpace(p.Description)) sb.AppendLine(p.Description);
                        if (p.Technologies.Count > 0) sb.AppendLine($"Technologies: {string.Join(", ", p.Technologies)}");
                        sb.AppendLine();
                    }
                    break;

                case "education" when doc.Education.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("education", lang));
                    foreach (var edu in doc.Education)
                    {
                        sb.AppendLine($"{edu.Degree} - {edu.School}");
                        sb.AppendLine(edu.GraduationYear);
                    }
                    sb.AppendLine();
                    break;

                case "skills" when doc.SkillCategories.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("skills", lang));
                    foreach (var cat in doc.SkillCategories) sb.AppendLine($"{cat.Name}: {string.Join(", ", cat.Skills)}");
                    sb.AppendLine();
                    break;

                case "languages" when doc.Languages.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("languages", lang));
                    sb.AppendLine(string.Join(", ", doc.Languages.Select(l => $"{l.Name} ({l.Level})")));
                    sb.AppendLine();
                    break;

                case "certifications" when doc.Certifications.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("certifications", lang));
                    foreach (var c in doc.Certifications) sb.AppendLine($"{c.Name} - {c.Issuer} ({CvTextHelpers.FormatMonth(c.Date, lang)})");
                    sb.AppendLine();
                    break;

                case "interests" when doc.Interests.Count > 0:
                    Section(sb, CvTextHelpers.SectionLabel("interests", lang));
                    sb.AppendLine(string.Join(", ", doc.Interests));
                    sb.AppendLine();
                    break;
            }
        }

        return sb.ToString();
    }

    private static void Section(StringBuilder sb, string title)
    {
        sb.AppendLine(title.ToUpperInvariant());
        sb.AppendLine(new string('-', title.Length));
    }
}
