using System.Text.RegularExpressions;
using CvForge.Api.Domain;
using FluentValidation;

namespace CvForge.Api.Validation;

public partial class CvDocumentValidator : AbstractValidator<CvDocument>
{
    private static readonly string[] ValidTemplates = ["modern", "minimal", "executive", "tech", "ats"];
    private static readonly string[] ValidFonts = ["inter", "roboto", "lora", "jetbrains-mono", "system"];
    private static readonly string[] ValidSpacings = ["compact", "normal", "relaxed"];

    public CvDocumentValidator()
    {
        RuleFor(d => d.TemplateKey).Must(t => ValidTemplates.Contains(t))
            .WithMessage($"TemplateKey doit être l'un de : {string.Join(", ", ValidTemplates)}.");

        RuleFor(d => d.Summary).MaximumLength(2000);

        RuleFor(d => d.Settings.PrimaryColor).Matches(HexColorRegex()).WithMessage("Couleur hexadécimale invalide.");
        RuleFor(d => d.Settings.SecondaryColor).Matches(HexColorRegex()).WithMessage("Couleur hexadécimale invalide.");
        RuleFor(d => d.Settings.FontFamily).Must(f => ValidFonts.Contains(f));
        RuleFor(d => d.Settings.FontScale).InclusiveBetween(0.85, 1.20);
        RuleFor(d => d.Settings.Spacing).Must(s => ValidSpacings.Contains(s));
        RuleFor(d => d.Settings.CvLanguage).Must(l => l is "fr" or "en");

        RuleFor(d => d.PersonalInfo.Email).EmailAddress().When(d => !string.IsNullOrWhiteSpace(d.PersonalInfo.Email));
        RuleFor(d => d.PersonalInfo.FirstName).MaximumLength(120);
        RuleFor(d => d.PersonalInfo.LastName).MaximumLength(120);
    }

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexColorRegex();
}
