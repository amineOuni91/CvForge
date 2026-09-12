using System.Net.Http.Json;

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

    private record AccessTokenResponse(string TokenType, string AccessToken, int ExpiresIn, string RefreshToken);
}
