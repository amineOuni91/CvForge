using CvForge.Api.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CvForge.Tests.Infrastructure;

/// <summary>
/// Runs the real app against a dedicated "CvForgeTests" database (same local SQL Server
/// instance, separate from the dev "CvForge" database) so tests never touch dev data.
/// </summary>
public class CvForgeWebApplicationFactory : WebApplicationFactory<Program>
{
    private const string TestConnectionString =
        "Server=localhost;Database=CvForgeTests;Trusted_Connection=True;TrustServerCertificate=True";

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = TestConnectionString,
            });
        });

        base.ConfigureWebHost(builder);
    }

    public async Task InitializeDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }
}
