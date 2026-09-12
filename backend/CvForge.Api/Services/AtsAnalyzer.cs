using System.Text.RegularExpressions;
using CvForge.Api.Domain;

namespace CvForge.Api.Services;

public record AtsRuleResult(string Rule, bool Passed, string Detail);

public record AtsAnalysisResult(
    int AtsScore,
    int ContentScore,
    int TechnicalSkillsScore,
    int ExperienceScore,
    int OverallScore,
    List<AtsRuleResult> Rules);

/// <summary>
/// Deterministic ATS scoring (C# rules, not an LLM) — reproducible and explainable: the same CV
/// always yields the same score. Recommendations are the plain rule failure messages.
/// </summary>
public static partial class AtsAnalyzer
{
    public static AtsAnalysisResult Analyze(CvDocument doc)
    {
        var rules = new List<AtsRuleResult>();

        var hasPhoto = !string.IsNullOrWhiteSpace(doc.PersonalInfo.PhotoUrl);
        rules.Add(new AtsRuleResult("Pas de photo", !hasPhoto,
            hasPhoto ? "Une photo peut perturber certains parseurs ATS." : "Aucune photo, bon pour l'ATS."));

        var isMultiColumn = doc.TemplateKey == "executive";
        rules.Add(new AtsRuleResult("Mise en page une colonne", !isMultiColumn,
            isMultiColumn ? "Le template Executive utilise 2 colonnes, difficile à parser." : "Mise en page linéaire."));

        var essentialSections = new[] { "experiences", "education", "skills" };
        var hiddenEssentials = essentialSections.Where(s => doc.Settings.HiddenSections.Contains(s)).ToList();
        rules.Add(new AtsRuleResult("Sections essentielles visibles", hiddenEssentials.Count == 0,
            hiddenEssentials.Count == 0 ? "Expérience, formation et compétences sont visibles." : $"Sections masquées : {string.Join(", ", hiddenEssentials)}."));

        var datesConsistent = doc.Experiences.All(IsDateRangeConsistent) && doc.Education.All(IsDateRangeConsistent);
        rules.Add(new AtsRuleResult("Dates cohérentes", datesConsistent,
            datesConsistent ? "Toutes les dates sont renseignées et cohérentes." : "Certaines entrées ont des dates manquantes ou incohérentes."));

        var contactComplete = !string.IsNullOrWhiteSpace(doc.PersonalInfo.Email) && !string.IsNullOrWhiteSpace(doc.PersonalInfo.Phone);
        rules.Add(new AtsRuleResult("Contact complet", contactComplete,
            contactComplete ? "Email et téléphone renseignés." : "Email ou téléphone manquant."));

        var bullets = doc.Experiences.SelectMany(e => e.Achievements).ToList();
        var quantifiedRatio = bullets.Count == 0 ? 0 : bullets.Count(HasDigit) / (double)bullets.Count;
        rules.Add(new AtsRuleResult("Réalisations quantifiées", quantifiedRatio >= 0.5,
            bullets.Count == 0
                ? "Aucune réalisation renseignée."
                : $"{bullets.Count(HasDigit)}/{bullets.Count} réalisations contiennent un chiffre."));

        var atsScore = 100;
        if (hasPhoto) atsScore -= 20;
        if (isMultiColumn) atsScore -= 20;
        if (hiddenEssentials.Count > 0) atsScore -= 15 * hiddenEssentials.Count;
        if (!datesConsistent) atsScore -= 15;
        if (!contactComplete) atsScore -= 15;
        atsScore = Math.Clamp(atsScore, 0, 100);

        var contentScore = 0;
        if (!string.IsNullOrWhiteSpace(doc.Summary)) contentScore += 20;
        if (doc.Experiences.Any(e => !string.IsNullOrWhiteSpace(e.Description))) contentScore += 20;
        if (doc.Projects.Count > 0 || doc.Certifications.Count > 0) contentScore += 20;
        if (doc.SkillCategories.Count(c => c.Skills.Count > 0) >= 2) contentScore += 20;
        if (doc.Languages.Count > 0) contentScore += 20;

        var totalSkills = doc.SkillCategories.Sum(c => c.Skills.Count);
        var technicalSkillsScore = Math.Clamp(totalSkills * 10, 0, 100);

        var experienceScore = Math.Clamp(doc.Experiences.Count * 25, 0, 75)
                               + (int)Math.Round(quantifiedRatio * 25);
        experienceScore = Math.Clamp(experienceScore, 0, 100);

        var overallScore = (int)Math.Round((atsScore + contentScore + technicalSkillsScore + experienceScore) / 4.0);

        return new AtsAnalysisResult(atsScore, contentScore, technicalSkillsScore, experienceScore, overallScore, rules);
    }

    private static bool IsDateRangeConsistent(Experience exp) =>
        MonthRegex().IsMatch(exp.StartDate) && (exp.IsCurrent || (exp.EndDate is not null && MonthRegex().IsMatch(exp.EndDate) && string.CompareOrdinal(exp.EndDate, exp.StartDate) >= 0));

    private static bool IsDateRangeConsistent(EducationEntry edu) =>
        YearRegex().IsMatch(edu.GraduationYear);

    private static bool HasDigit(string text) => text.Any(char.IsDigit);

    [GeneratedRegex(@"^\d{4}-\d{2}$")]
    private static partial Regex MonthRegex();

    [GeneratedRegex(@"^\d{4}$")]
    private static partial Regex YearRegex();
}
