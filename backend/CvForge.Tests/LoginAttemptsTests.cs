using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class LoginAttemptsTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task FailedLogins_ReportRemainingAttempts_ThenLockout()
    {
        var (_, email) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var client = fixture.Factory.CreateClient();

        async Task<JsonElement> FailAsync()
        {
            var response = await client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password = "Wrong123!@#" });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }

        // Identity default: 5 failures → locked out
        for (var remaining = 4; remaining >= 1; remaining--)
        {
            var body = await FailAsync();
            Assert.Equal("Failed", body.GetProperty("detail").GetString());
            Assert.Equal(remaining, body.GetProperty("remainingAttempts").GetInt32());
        }

        var locked = await FailAsync();
        Assert.Equal("LockedOut", locked.GetProperty("detail").GetString());
        Assert.True(locked.GetProperty("lockoutEnd").GetDateTimeOffset() > DateTimeOffset.UtcNow);

        // Even the right password is refused while locked out
        var right = await client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email, password = TestUser.Password });
        Assert.Equal(HttpStatusCode.Unauthorized, right.StatusCode);
    }

    [Fact]
    public async Task FailedLogin_UnknownEmail_HasNoAttemptCounter()
    {
        var client = fixture.Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login?useCookies=false",
            new { email = $"nobody-{Guid.NewGuid():N}@example.com", password = "Wrong123!@#" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.TryGetProperty("remainingAttempts", out _));
    }
}
