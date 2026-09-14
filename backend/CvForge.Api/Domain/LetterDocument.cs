namespace CvForge.Api.Domain;

public class LetterDocument
{
    public string TemplateKey { get; set; } = "classique";
    public LetterSettings Settings { get; set; } = new();
    public PersonalInfo Sender { get; set; } = new();
    public RecipientInfo Recipient { get; set; } = new();
    public string JobTitle { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Introduction { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string Conclusion { get; set; } = string.Empty;
}

public class RecipientInfo
{
    public string RecruiterName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyAddress { get; set; } = string.Empty;
}

public class LetterSettings
{
    public string PrimaryColor { get; set; } = "#0F172A";
    public string SecondaryColor { get; set; } = "#64748B";
    public string FontFamily { get; set; } = "inter";
    public double FontScale { get; set; } = 1.0;
    public string Language { get; set; } = "fr";
}
