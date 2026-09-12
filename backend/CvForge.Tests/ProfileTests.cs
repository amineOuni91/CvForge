using System.Net;
using System.Net.Http.Json;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests;

[Collection("Database collection")]
public class ProfileTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task UpdateMe_PersistsDisplayNameAndPersonalInfo()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var personalInfo = new { firstName = "Amine", lastName = "Ouni", jobTitle = "Dev", email = "a@b.com",
            phone = "0600000000", city = "Paris", country = "France", linkedIn = "li", gitHub = "gh", portfolio = "p", website = "w" };

        var patchResponse = await client.PatchAsJsonAsync("/api/auth/me", new { displayName = "Amine O.", personalInfo });
        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");

        Assert.Equal("Amine O.", me!.DisplayName);
        Assert.Equal("Amine", me.ProfileInfo.FirstName);
        Assert.Equal("Dev", me.ProfileInfo.JobTitle);
    }

    [Fact]
    public async Task ChangePassword_WithCorrectOldPassword_AllowsLoginWithNewPassword()
    {
        var (client, email) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        const string newPassword = "NewTest456!@#";

        var response = await client.PostAsJsonAsync("/api/auth/manage/info", new { oldPassword = TestUser.Password, newPassword });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var login = await fixture.Factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password = newPassword });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithWrongOldPassword_Fails()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var response = await client.PostAsJsonAsync("/api/auth/manage/info", new { oldPassword = "WrongPassword!@#", newPassword = "NewTest456!@#" });

        Assert.False(response.IsSuccessStatusCode);
    }

    [Fact]
    public async Task EmailChange_WithCorrectCode_UpdatesEmailAndAllowsLoginWithNewEmail()
    {
        var (client, originalEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var newEmail = $"changed-{Guid.NewGuid():N}@example.com";

        var requestResponse = await client.PostAsJsonAsync("/api/auth/email-change/request", new { newEmail });
        Assert.Equal(HttpStatusCode.OK, requestResponse.StatusCode);

        var code = await GenerateEmailChangeCodeAsync(originalEmail, newEmail);
        var confirmResponse = await client.PostAsJsonAsync("/api/auth/email-change/confirm", new { newEmail, code });
        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");
        Assert.Equal(newEmail, me!.Email);

        var login = await fixture.Factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login?useCookies=false", new { email = newEmail, password = TestUser.Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task EmailChange_WithWrongCode_Fails()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var newEmail = $"changed-{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/email-change/confirm", new { newEmail, code = "not-a-valid-code" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EmailChange_ToAlreadyUsedEmail_IsRejected()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var (_, otherEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);

        var response = await client.PostAsJsonAsync("/api/auth/email-change/request", new { newEmail = otherEmail });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Simulates "reading the email": generates the same token the request endpoint sent, via the real UserManager.</summary>
    private async Task<string> GenerateEmailChangeCodeAsync(string currentEmail, string newEmail)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByEmailAsync(currentEmail);
        return await userManager.GenerateChangeEmailTokenAsync(user!, newEmail);
    }

    private record MeDto(string Id, string Email, string DisplayName, PersonalInfoDto ProfileInfo);
    private record PersonalInfoDto(string FirstName, string LastName, string JobTitle);
}
