using System.Net.Http.Json;
using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests.Infrastructure;

/// <summary>Registers + logs in a fresh, uniquely-named user and returns an authenticated HttpClient.</summary>
public static class TestUser
{
    public const string Password = "Test123!@#";

    public static async Task<HttpClient> CreateAuthenticatedClientAsync(CvForgeWebApplicationFactory factory)
    {
        var (client, _) = await CreateAuthenticatedClientWithEmailAsync(factory);
        return client;
    }

    public static async Task<(HttpClient Client, string Email)> CreateAuthenticatedClientWithEmailAsync(CvForgeWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        var email = $"test-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new { email, password = Password });
        registerResponse.EnsureSuccessStatusCode();

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password = Password });
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<AccessTokenResponse>();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        return (client, email);
    }

    /// <summary>
    /// Registers a user, promotes it to the "Admin" role directly via UserManager (creating the
    /// role first if needed), THEN logs in — the bearer token's role claim is baked in at login
    /// time, so the role must exist before that call, not after.
    /// </summary>
    public static async Task<(HttpClient Client, string Email, string UserId)> CreateAuthenticatedAdminClientWithEmailAsync(CvForgeWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        var email = $"admin-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new { email, password = Password });
        registerResponse.EnsureSuccessStatusCode();

        string userId;
        using (var scope = factory.Services.CreateScope())
        {
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            if (!await roleManager.RoleExistsAsync("Admin"))
                await roleManager.CreateAsync(new IdentityRole("Admin"));

            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var user = await userManager.FindByEmailAsync(email);
            await userManager.AddToRoleAsync(user!, "Admin");
            userId = user!.Id;
        }

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password = Password });
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<AccessTokenResponse>();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        return (client, email, userId);
    }

    private record AccessTokenResponse(string TokenType, string AccessToken, int ExpiresIn, string RefreshToken);
}
