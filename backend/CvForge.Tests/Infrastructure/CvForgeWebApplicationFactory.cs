using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
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

        // Program.cs decides real-SMTP-vs-logging by reading Smtp:User/Smtp:AppPassword from
        // builder.Configuration BEFORE builder.Build() — earlier than ConfigureAppConfiguration's
        // override above takes effect — so if dev user-secrets are present, tests would otherwise
        // register the real SmtpEmailSender and fire actual Gmail sends. A registration burst here
        // previously tripped Gmail's rate limit and surfaced as intermittent 500s on
        // /api/auth/register. ConfigureTestServices runs after Program.cs's own registrations, so
        // it can unconditionally force the safe LoggingEmailSender for every test.
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<LoggingEmailSender>();
            services.AddSingleton<IEmailSender<AppUser>>(sp => sp.GetRequiredService<LoggingEmailSender>());
            services.AddSingleton<IEmailChangeSender>(sp => sp.GetRequiredService<LoggingEmailSender>());
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
