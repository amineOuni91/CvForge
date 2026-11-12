using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Endpoints;
using CvForge.Api.Services;
using CvForge.Api.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);
// Published desktop app (publish.ps1) runs in Production: still read the Gmail SMTP user-secrets on this machine
if (!builder.Environment.IsDevelopment())
    builder.Configuration.AddUserSecrets<Program>(optional: true);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
});
builder.Services
    .AddIdentityApiEndpoints<AppUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();
var gmailUser = builder.Configuration["Smtp:User"];
var gmailAppPassword = builder.Configuration["Smtp:AppPassword"];
if (!string.IsNullOrWhiteSpace(gmailUser) && !string.IsNullOrWhiteSpace(gmailAppPassword))
{
    builder.Services.AddSingleton(new SmtpEmailSender(gmailUser, gmailAppPassword));
    builder.Services.AddSingleton<IEmailSender<AppUser>>(sp => sp.GetRequiredService<SmtpEmailSender>());
    builder.Services.AddSingleton<IEmailChangeSender>(sp => sp.GetRequiredService<SmtpEmailSender>());
}
else
{
    builder.Services.AddSingleton<LoggingEmailSender>();
    builder.Services.AddSingleton<IEmailSender<AppUser>>(sp => sp.GetRequiredService<LoggingEmailSender>());
    builder.Services.AddSingleton<IEmailChangeSender>(sp => sp.GetRequiredService<LoggingEmailSender>());
}
builder.Services.AddScoped<IValidator<CvDocument>, CvDocumentValidator>();
builder.Services.AddScoped<IValidator<LetterDocument>, LetterDocumentValidator>();
builder.Services.AddSingleton<PdfService>();
builder.Services.AddSingleton<CvForge.Api.Services.DocxExport.DocxExportService>();
builder.Services.AddSingleton<TxtExportService>();
builder.Services.AddSingleton<CvForge.Api.Services.LetterExport.LetterDocxService>();
builder.Services.AddSingleton<LetterTxtExportService>();

const string FrontendCorsPolicy = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Published app: the Angular build sits in wwwroot (see publish.ps1); in development the Angular dev server serves it
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var authGroup = app.MapGroup("/api/auth");
authGroup.MapIdentityApi<AppUser>().AddEndpointFilter(AuthEndpoints.LoginAttemptsFilter);
authGroup.MapAuthEndpoints();

var cvGroup = app.MapGroup("/api/cvs");
cvGroup.MapCvEndpoints();
cvGroup.MapExportEndpoints();

var letterGroup = app.MapGroup("/api/letters");
letterGroup.MapLetterEndpoints();
letterGroup.MapLetterExportEndpoints();

app.MapGroup("/api/ats").MapAtsEndpoints();
app.MapGroup("/api/import").MapImportEndpoints();

// public: shown on the landing page, no account data exposed
app.MapGroup("/api/stats").MapStatsEndpoints();

app.MapGroup("/api/admin").RequireAuthorization("AdminOnly").MapAdminEndpoints();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var bootstrapAdmin = await userManager.FindByEmailAsync("amine.ouni91@gmail.com");
    if (bootstrapAdmin is not null && !await userManager.IsInRoleAsync(bootstrapAdmin, "Admin"))
        await userManager.AddToRoleAsync(bootstrapAdmin, "Admin");
}

// Angular routes (/editor/3…) reloaded in the browser get index.html; files and /api addresses stay 404
app.MapFallbackToFile("{**path:nonfile:regex(^(?!api/).*$)}", "index.html");

// Desktop shortcut ("OpenBrowser": true in appsettings.Production.json): opens the browser once the app listens.
// Already running → port taken: open the browser on the running copy and stop this one.
if (app.Configuration.GetValue<bool>("OpenBrowser"))
{
    var url = (app.Configuration["Urls"] ?? "http://localhost:5000").Split(';')[0];
    app.Lifetime.ApplicationStarted.Register(() => OpenBrowser(url));
    try { app.Run(); }
    catch (IOException) { OpenBrowser(url); }
    return;
}

app.Run();

static void OpenBrowser(string url) => Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });

/// <summary>Exposed for WebApplicationFactory&lt;Program&gt; in CvForge.Tests.</summary>
public partial class Program { }
