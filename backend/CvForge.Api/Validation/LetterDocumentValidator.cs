using System.Text.RegularExpressions;
using CvForge.Api.Domain;
using FluentValidation;

namespace CvForge.Api.Validation;

public partial class LetterDocumentValidator : AbstractValidator<LetterDocument>
{
    private static readonly string[] ValidTemplates = ["classique", "epure", "formel", "creatif", "ats"];
    private static readonly string[] ValidFonts = ["inter", "roboto", "lora", "jetbrains-mono", "system"];

    public LetterDocumentValidator()
    {
        RuleFor(d => d.TemplateKey).Must(t => ValidTemplates.Contains(t))
            .WithMessage($"TemplateKey doit être l'un de : {string.Join(", ", ValidTemplates)}.");

        RuleFor(d => d.Settings.PrimaryColor).Matches(HexColorRegex()).WithMessage("Couleur hexadécimale invalide.");
        RuleFor(d => d.Settings.SecondaryColor).Matches(HexColorRegex()).WithMessage("Couleur hexadécimale invalide.");
        RuleFor(d => d.Settings.FontFamily).Must(f => ValidFonts.Contains(f));
        RuleFor(d => d.Settings.FontScale).InclusiveBetween(0.85, 1.20);
        RuleFor(d => d.Settings.Language).Must(l => l is "fr" or "en");

        RuleFor(d => d.Sender.Email).EmailAddress().When(d => !string.IsNullOrWhiteSpace(d.Sender.Email));
        RuleFor(d => d.Introduction).MaximumLength(2000);
        RuleFor(d => d.Motivation).MaximumLength(2000);
        RuleFor(d => d.Skills).MaximumLength(2000);
        RuleFor(d => d.Conclusion).MaximumLength(2000);
    }

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexColorRegex();
}
