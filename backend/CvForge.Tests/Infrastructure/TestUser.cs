using System.Net.Http.Json;

namespace CvForge.Tests.Infrastructure;

/// <summary>Registers + logs in a fresh, uniquely-named user and returns an authenticated HttpClient.</summary>
public static class TestUser
{
    public static async Task<HttpClient> CreateAuthenticatedClientAsync(CvForgeWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        var email = $"test-{Guid.NewGuid():N}@example.com";
        const string password = "Test123!@#";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new { email, password });
        registerResponse.EnsureSuccessStatusCode();

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password });
        loginResponse.EnsureSuccessStatusCode();
        var tokens = await loginResponse.Content.ReadFromJsonAsync<AccessTokenResponse>();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);
        return client;
    }

    private record AccessTokenResponse(string TokenType, string AccessToken, int ExpiresIn, string RefreshToken);
}
