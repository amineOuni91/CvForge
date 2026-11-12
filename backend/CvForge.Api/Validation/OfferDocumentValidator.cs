using System.Globalization;
using CvForge.Api.Domain;
using FluentValidation;

namespace CvForge.Api.Validation;

public class OfferDocumentValidator : AbstractValidator<OfferDocument>
{
    private static readonly string[] Statuses = ["toApply", "applied", "interview", "rejected"];
    private static readonly string[] StepTypes = ["cvSent", "hrCall", "hrInterview", "techInterview", "techTest", "directorInterview", "offerReceived", "other"];
    private static readonly string[] Formats = ["phone", "video", "onSite"];
    private static readonly string[] Results = ["upcoming", "passed", "failed", "cancelled"];

    public OfferDocumentValidator()
    {
        RuleFor(d => d.Status).Must(s => Statuses.Contains(s));
        RuleFor(d => d.Url).Must(u => string.IsNullOrEmpty(u) ||
            (Uri.TryCreate(u, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
            .WithMessage("Url doit être une adresse http(s) absolue.");
        RuleFor(d => d.Title).MaximumLength(200);
        RuleFor(d => d.Company).MaximumLength(200);
        RuleFor(d => d.Location).MaximumLength(200);
        RuleFor(d => d.ContractType).MaximumLength(200);
        RuleFor(d => d.Description).MaximumLength(10000);
        RuleFor(d => d.Notes).MaximumLength(5000);
        RuleFor(d => d.Steps).Must(s => s.Count <= 50);
        RuleForEach(d => d.Technologies).MaximumLength(100);
        RuleForEach(d => d.Steps).ChildRules(s =>
        {
            s.RuleFor(x => x.Type).Must(v => StepTypes.Contains(v));
            s.RuleFor(x => x.Format).Must(v => Formats.Contains(v));
            s.RuleFor(x => x.Result).Must(v => Results.Contains(v));
            s.RuleFor(x => x.Date).Must(v => string.IsNullOrEmpty(v) ||
                DateTime.TryParseExact(v, "yyyy-MM-ddTHH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                .WithMessage("Date doit être au format yyyy-MM-ddTHH:mm.");
            s.RuleFor(x => x.NoteBefore).MaximumLength(5000);
            s.RuleFor(x => x.NoteAfter).MaximumLength(5000);
        });
    }
}
