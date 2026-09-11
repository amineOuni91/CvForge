using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Services;

/// <summary>Dev-only: no SMTP configured, so auth links are written to the log instead of emailed.</summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender<AppUser>
{
    public Task SendConfirmationLinkAsync(AppUser user, string email, string confirmationLink)
    {
        logger.LogInformation("[DEV EMAIL] Confirmation link for {Email}: {Link}", email, confirmationLink);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetLinkAsync(AppUser user, string email, string resetLink)
    {
        logger.LogInformation("[DEV EMAIL] Password reset link for {Email}: {Link}", email, resetLink);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetCodeAsync(AppUser user, string email, string resetCode)
    {
        logger.LogInformation("[DEV EMAIL] Password reset code for {Email}: {Code}", email, resetCode);
        return Task.CompletedTask;
    }
}
