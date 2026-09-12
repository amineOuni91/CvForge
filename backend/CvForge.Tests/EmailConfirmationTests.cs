using System.Net;
using System.Net.Http.Json;
using System.Text;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests;

/// <summary>
/// Covers POST /api/auth/confirm-email-code — the code-based replacement for MapIdentityApi's
/// built-in link-based /confirmEmail (see EmailLinkHelpers for why: Gmail mangled long links).
/// </summary>
[Collection("Database collection")]
public class EmailConfirmationTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task ConfirmEmailCode_WithValidCode_ConfirmsTheAccount()
    {
        var (_, email) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var code = await GenerateEmailConfirmationCodeAsync(email);
        var anonymous = fixture.Factory.CreateClient();

        var response = await anonymous.PostAsJsonAsync("/api/auth/confirm-email-code", new { email, code });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(await IsEmailConfirmedAsync(email));
    }

    [Fact]
    public async Task ConfirmEmailCode_WithInvalidCode_Fails()
    {
        var (_, email) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var anonymous = fixture.Factory.CreateClient();

        var response = await anonymous.PostAsJsonAsync("/api/auth/confirm-email-code", new { email, code = "not-a-valid-code" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(await IsEmailConfirmedAsync(email));
    }

    /// <summary>Simulates "reading the email": same token + encoding SmtpEmailSender/EmailLinkHelpers produce.</summary>
    private async Task<string> GenerateEmailConfirmationCodeAsync(string email)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(email);
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user!);
        return WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
    }

    private async Task<bool> IsEmailConfirmedAsync(string email)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(email);
        return user is not null && await userManager.IsEmailConfirmedAsync(user);
    }
}
