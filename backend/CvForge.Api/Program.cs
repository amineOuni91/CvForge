using System.Security.Claims;
using System.Threading.RateLimiting;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Endpoints;
using CvForge.Api.Services;
using CvForge.Api.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthorization();
builder.Services
    .AddIdentityApiEndpoints<AppUser>()
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
builder.Services.AddSingleton<PdfService>();
builder.Services.AddSingleton<AiService>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddSingleton<CvForge.Api.Services.DocxExport.DocxExportService>();
builder.Services.AddSingleton<TxtExportService>();

const string AiRateLimitPolicy = "ai";
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(AiRateLimitPolicy, httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? httpContext.Connection.RemoteIpAddress?.ToString()
                      ?? "anonymous",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
        }));
});

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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var authGroup = app.MapGroup("/api/auth");
authGroup.MapIdentityApi<AppUser>();
authGroup.MapAuthEndpoints();

var cvGroup = app.MapGroup("/api/cvs");
cvGroup.MapCvEndpoints();
cvGroup.MapExportEndpoints();

app.MapGroup("/api/ai").RequireRateLimiting(AiRateLimitPolicy).MapAiEndpoints();
app.MapGroup("/api/import").RequireRateLimiting(AiRateLimitPolicy).MapImportEndpoints();

// public: shown on the landing page, no account data exposed
app.MapGroup("/api/stats").MapStatsEndpoints();

app.Run();

/// <summary>Exposed for WebApplicationFactory&lt;Program&gt; in CvForge.Tests.</summary>
public partial class Program { }
