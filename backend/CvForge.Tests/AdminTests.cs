using System.Net.Http.Json;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class AdminTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task Me_ForOrdinaryUser_ReportsVisitorRole()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");

        Assert.Equal("visitor", me!.Role);
    }

    [Fact]
    public async Task Me_ForAdminUser_ReportsAdminRole()
    {
        var (client, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");

        Assert.Equal("admin", me!.Role);
    }

    private record MeDto(string Id, string Email, string DisplayName, bool EmailConfirmed, string Role);
}
