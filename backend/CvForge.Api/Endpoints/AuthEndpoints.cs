using System.Security.Claims;
using System.Text;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace CvForge.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/me", (ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = userManager.GetUserAsync(principal).GetAwaiter().GetResult();
            return user is null
                ? Results.NotFound()
                : Results.Ok(new { user.Id, user.Email, user.DisplayName, user.ProfileInfo, user.EmailConfirmed });
        }).RequireAuthorization();

        group.MapPatch("/me", async (UpdateProfileRequest request, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null) return Results.NotFound();

            user.DisplayName = request.DisplayName;
            user.ProfileInfo = request.PersonalInfo;
            await userManager.UpdateAsync(user);
            return Results.Ok(new { user.Id, user.Email, user.DisplayName, user.ProfileInfo, user.EmailConfirmed });
        }).RequireAuthorization();

        group.MapDelete("/me", async ([FromBody] DeleteAccountRequest request, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null) return Results.NotFound();

            if (!await userManager.CheckPasswordAsync(user, request.Password))
                return Results.BadRequest(new { error = "Mot de passe incorrect." });

            var result = await userManager.DeleteAsync(user);
            return result.Succeeded ? Results.Ok() : Results.BadRequest(new { error = "Échec de la suppression du compte." });
        }).RequireAuthorization();

        group.MapPost("/email-change/request", async (EmailChangeRequest request, ClaimsPrincipal principal, UserManager<AppUser> userManager, IEmailChangeSender emailSender) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null) return Results.NotFound();

            var existing = await userManager.FindByEmailAsync(request.NewEmail);
            if (existing is not null) return Results.BadRequest(new { error = "Cet email est déjà utilisé par un autre compte." });

            var code = await userManager.GenerateChangeEmailTokenAsync(user, request.NewEmail);
            await emailSender.SendEmailChangeCodeAsync(user, request.NewEmail, code);
            return Results.Ok();
        }).RequireAuthorization();

        group.MapPost("/email-change/confirm", async (EmailChangeConfirmRequest request, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null) return Results.NotFound();

            var result = await userManager.ChangeEmailAsync(user, request.NewEmail, request.Code);
            if (!result.Succeeded) return Results.BadRequest(new { error = "Code invalide ou expiré." });

            await userManager.SetUserNameAsync(user, request.NewEmail);
            return Results.Ok(new { user.Id, user.Email, user.DisplayName, user.ProfileInfo, user.EmailConfirmed });
        }).RequireAuthorization();

        // MapIdentityApi's built-in GET /confirmEmail expects the code straight off a clicked
        // link. SmtpEmailSender now emails just the code (see EmailLinkHelpers), so this
        // endpoint reverses the same base64url encoding the built-in link would have carried
        // before calling the identical ConfirmEmailAsync.
        group.MapPost("/confirm-email-code", async (ConfirmEmailCodeRequest request, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null) return Results.BadRequest(new { error = "Code invalide ou expiré." });

            string decodedCode;
            try
            {
                decodedCode = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Code));
            }
            catch (FormatException)
            {
                return Results.BadRequest(new { error = "Code invalide ou expiré." });
            }

            var result = await userManager.ConfirmEmailAsync(user, decodedCode);
            return result.Succeeded ? Results.Ok() : Results.BadRequest(new { error = "Code invalide ou expiré." });
        });
    }
}

public record UpdateProfileRequest(string DisplayName, PersonalInfo PersonalInfo);
public record DeleteAccountRequest(string Password);
public record EmailChangeRequest(string NewEmail);
public record EmailChangeConfirmRequest(string NewEmail, string Code);
public record ConfirmEmailCodeRequest(string Email, string Code);
