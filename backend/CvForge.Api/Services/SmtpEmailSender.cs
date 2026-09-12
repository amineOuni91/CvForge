using System.Net;
using System.Net.Mail;
using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Services;

/// <summary>
/// Sends real emails through a Gmail account (SMTP + app password, configured via
/// Smtp:User / Smtp:AppPassword user-secrets). Only registered when both are set;
/// see Program.cs — otherwise LoggingEmailSender keeps the dev-only logging behavior.
/// </summary>
public class SmtpEmailSender(string gmailUser, string appPassword) : IEmailSender<AppUser>, IEmailChangeSender
{
    public Task SendConfirmationLinkAsync(AppUser user, string email, string confirmationLink) =>
        SendAsync(email, "Confirmez votre compte CvForge",
            // MapIdentityApi only ever builds a clickable *link*; Gmail mangled the long
            // multi-parameter URL (dropped the "code" query param) even as an HTML <a href>,
            // so we extract the code and use the code-based confirm endpoint instead.
            $"""<p>Voici votre code de confirmation pour activer votre compte CvForge :</p><p style="font-size:20px;font-weight:bold;letter-spacing:1px;">{WebUtility.HtmlEncode(EmailLinkHelpers.ExtractCode(confirmationLink))}</p>""");

    public Task SendPasswordResetLinkAsync(AppUser user, string email, string resetLink) =>
        SendAsync(email, "Réinitialisez votre mot de passe CvForge",
            $"""<p>Voici votre code de réinitialisation de mot de passe :</p><p style="font-size:20px;font-weight:bold;letter-spacing:1px;">{WebUtility.HtmlEncode(EmailLinkHelpers.ExtractCode(resetLink))}</p>""");

    public Task SendPasswordResetCodeAsync(AppUser user, string email, string resetCode) =>
        SendAsync(email, "Votre code de réinitialisation CvForge",
            $"""<p>Voici votre code de réinitialisation de mot de passe :</p><p style="font-size:20px;font-weight:bold;letter-spacing:1px;">{WebUtility.HtmlEncode(resetCode)}</p>""");

    public Task SendEmailChangeCodeAsync(AppUser user, string newEmail, string code) =>
        SendAsync(newEmail, "Votre code de changement d'email CvForge",
            $"""<p>Voici votre code de confirmation pour changer l'email de votre compte CvForge :</p><p style="font-size:20px;font-weight:bold;letter-spacing:1px;">{WebUtility.HtmlEncode(code)}</p>""");

    private async Task SendAsync(string to, string subject, string htmlBody)
    {
        using var client = new SmtpClient("smtp.gmail.com", 587)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(gmailUser, appPassword),
        };
        using var message = new MailMessage(gmailUser, to, subject, htmlBody) { IsBodyHtml = true };
        await client.SendMailAsync(message);
    }
}
