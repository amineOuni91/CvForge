namespace CvForge.Api.Services;

/// <summary>Section labels and date formatting shared by every export format (DOCX, TXT) — mirrors
/// templates/format-month.ts and the SECTION_LABELS dict duplicated across the 5 Angular templates.</summary>
public static class CvTextHelpers
{
    private static readonly string[] MonthsFr =
        ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    private static readonly string[] MonthsEn =
        ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    private static readonly Dictionary<string, (string Fr, string En)> SectionLabels = new()
    {
        ["summary"] = ("Profil", "Profile"),
        ["experiences"] = ("Expérience", "Experience"),
        ["projects"] = ("Projets", "Projects"),
        ["education"] = ("Formation", "Education"),
        ["skills"] = ("Compétences", "Skills"),
        ["languages"] = ("Langues", "Languages"),
        ["certifications"] = ("Certifications", "Certifications"),
        ["interests"] = ("Centres d'intérêt", "Interests"),
    };

    public static string SectionLabel(string sectionId, string lang) =>
        SectionLabels.TryGetValue(sectionId, out var l) ? (lang == "fr" ? l.Fr : l.En) : sectionId;

    public static string MissionsLabel(string lang) => lang == "fr" ? "Missions" : "Responsibilities";
    public static string AchievementsLabel(string lang) => lang == "fr" ? "Réalisations" : "Achievements";
    public static string PresentLabel(string lang) => lang == "fr" ? "Présent" : "Present";

    public static string FormatMonth(string? value, string lang)
    {
        if (string.IsNullOrEmpty(value)) return "";
        var parts = value.Split('-');
        if (parts.Length != 2 || !int.TryParse(parts[1], out var month) || month is < 1 or > 12) return value;
        var months = lang == "fr" ? MonthsFr : MonthsEn;
        return $"{months[month - 1]} {parts[0]}";
    }

    /// <summary>Joins non-blank fields with a separator, skipping blanks instead of leaving a dangling separator
    /// (e.g. "Position · " when Company is empty). Mirrors templates/join-fields.ts on the frontend.</summary>
    public static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Where(p => !string.IsNullOrWhiteSpace(p)));

    /// <summary>Appends a detail in parentheses only when both base and detail are present; falls back to
    /// whichever one exists rather than rendering a bare "()" or "Name ()".</summary>
    public static string WithDetail(string? baseText, string? detail)
    {
        var b = baseText?.Trim() ?? "";
        var d = detail?.Trim() ?? "";
        if (b.Length > 0 && d.Length > 0) return $"{b} ({d})";
        return b.Length > 0 ? b : d;
    }
}
