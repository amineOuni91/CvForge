namespace CvForge.Api.Domain;

public class CvDocument
{
    public string TemplateKey { get; set; } = "modern";
    public CvSettings Settings { get; set; } = new();
    public PersonalInfo PersonalInfo { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public List<Experience> Experiences { get; set; } = [];
    public List<Project> Projects { get; set; } = [];
    public List<EducationEntry> Education { get; set; } = [];
    public List<SkillCategory> SkillCategories { get; set; } = [];
    public List<LanguageEntry> Languages { get; set; } = [];
    public List<Certification> Certifications { get; set; } = [];
    public List<string> Interests { get; set; } = [];
}

public class CvSettings
{
    public string PrimaryColor { get; set; } = "#0F172A";
    public string SecondaryColor { get; set; } = "#64748B";
    public string FontFamily { get; set; } = "inter";
    public double FontScale { get; set; } = 1.0;
    public string Spacing { get; set; } = "normal";
    public string CvLanguage { get; set; } = "fr";
    public List<string> SectionOrder { get; set; } =
        ["summary", "experiences", "projects", "education", "skills", "languages", "certifications", "interests"];
    public List<string> HiddenSections { get; set; } = [];
}

public class PersonalInfo
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string LinkedIn { get; set; } = string.Empty;
    public string GitHub { get; set; } = string.Empty;
    public string Portfolio { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
}

public class Experience
{
    public string Position { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<string> Technologies { get; set; } = [];
    public List<string> Missions { get; set; } = [];
    public List<string> Achievements { get; set; } = [];
}

public class Project
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Technologies { get; set; } = [];
    public string Url { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
}

public class EducationEntry
{
    public string Degree { get; set; } = string.Empty;
    public string School { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string GraduationYear { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SkillCategory
{
    public string Name { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = [];
}

public class LanguageEntry
{
    public string Name { get; set; } = string.Empty;
    public string Level { get; set; } = "B1";
}

public class Certification
{
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}
