using CvForge.Api.Domain;

namespace CvForge.Api.Services;

/// <summary>Sends the confirmation code for the code-based email-change flow (Endpoints/AuthEndpoints.cs).</summary>
public interface IEmailChangeSender
{
    Task SendEmailChangeCodeAsync(AppUser user, string newEmail, string code);
}
