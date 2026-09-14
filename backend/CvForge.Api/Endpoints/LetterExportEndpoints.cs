using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using CvForge.Api.Services.LetterExport;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Endpoints;

public static class LetterExportEndpoints
{
    private static readonly string[] SupportedFormats = ["pdf", "docx", "txt", "html", "json"];

    public static void MapLetterExportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/{id:guid}/export/{format}", async (
            Guid id,
            string format,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager,
            PdfService pdfService,
            LetterDocxService letterDocxService,
            LetterTxtExportService letterTxtExportService) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            if (letter is null) return Results.NotFound();

            return await RenderLetterExportAsync(letter, format, pdfService, letterDocxService, letterTxtExportService);
        }).RequireAuthorization();

        group.MapGet("/{id:guid}/thumbnail", async (
            Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager, PdfService pdfService) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var letter = await db.LoadOwnedLetterAsync(userId, id);
            if (letter is null) return Results.NotFound();

            var imageBytes = await pdfService.RenderLetterThumbnailAsync(letter);
            return Results.File(imageBytes, "image/jpeg");
        }).RequireAuthorization();
    }

    public static async Task<IResult> RenderLetterExportAsync(
        CoverLetter letter,
        string format,
        PdfService pdfService,
        LetterDocxService letterDocxService,
        LetterTxtExportService letterTxtExportService)
    {
        if (!SupportedFormats.Contains(format))
        {
            return Results.BadRequest(new { error = $"Format non supporté : {format}. Formats disponibles : {string.Join(", ", SupportedFormats)}." });
        }

        return format switch
        {
            "pdf" => Results.File(await pdfService.RenderLetterPdfAsync(letter), "application/pdf", FileName(letter.Name, "pdf")),
            "docx" => Results.File(
                letterDocxService.Render(letter.Document),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                FileName(letter.Name, "docx")),
            "txt" => Results.File(Encoding.UTF8.GetBytes(letterTxtExportService.Render(letter.Document)), "text/plain; charset=utf-8", FileName(letter.Name, "txt")),
            "html" => Results.File(Encoding.UTF8.GetBytes(await pdfService.RenderLetterHtmlAsync(letter)), "text/html; charset=utf-8", FileName(letter.Name, "html")),
            "json" => Results.File(
                Encoding.UTF8.GetBytes(JsonSerializer.Serialize(letter.Document, new JsonSerializerOptions { WriteIndented = true })),
                "application/json",
                FileName(letter.Name, "json")),
            _ => Results.BadRequest(),
        };
    }

    private static string FileName(string letterName, string extension) => $"{letterName}.{extension}".Replace(' ', '-');
}
