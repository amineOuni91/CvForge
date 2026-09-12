using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CvForge.Api.Data;
using CvForge.Api.Domain;
using CvForge.Api.Services;
using CvForge.Api.Services.DocxExport;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Endpoints;

public static class ExportEndpoints
{
    private static readonly string[] SupportedFormats = ["pdf", "docx", "txt", "html", "json"];

    public static void MapExportEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/{id:guid}/export/{format}", async (
            Guid id,
            string format,
            ClaimsPrincipal principal,
            AppDbContext db,
            UserManager<AppUser> userManager,
            PdfService pdfService,
            DocxExportService docxExportService,
            TxtExportService txtExportService) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            if (cv is null) return Results.NotFound();

            return await RenderExportAsync(cv, format, pdfService, docxExportService, txtExportService);
        }).RequireAuthorization();

        group.MapGet("/{id:guid}/thumbnail", async (
            Guid id, ClaimsPrincipal principal, AppDbContext db, UserManager<AppUser> userManager, PdfService pdfService) =>
        {
            var userId = userManager.GetUserId(principal)!;
            var cv = await db.LoadOwnedCvAsync(userId, id);
            if (cv is null) return Results.NotFound();

            var imageBytes = await pdfService.RenderThumbnailAsync(cv);
            return Results.File(imageBytes, "image/jpeg");
        }).RequireAuthorization();
    }

    public static async Task<IResult> RenderExportAsync(
        Cv cv,
        string format,
        PdfService pdfService,
        DocxExportService docxExportService,
        TxtExportService txtExportService)
    {
        if (!SupportedFormats.Contains(format))
        {
            return Results.BadRequest(new { error = $"Format non supporté : {format}. Formats disponibles : {string.Join(", ", SupportedFormats)}." });
        }

        return format switch
        {
            "pdf" => Results.File(await pdfService.RenderCvPdfAsync(cv), "application/pdf", FileName(cv.Name, "pdf")),
            "docx" => Results.File(
                docxExportService.Render(cv.Document),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                FileName(cv.Name, "docx")),
            "txt" => Results.File(Encoding.UTF8.GetBytes(txtExportService.Render(cv.Document)), "text/plain; charset=utf-8", FileName(cv.Name, "txt")),
            "html" => Results.File(Encoding.UTF8.GetBytes(await pdfService.RenderCvHtmlAsync(cv)), "text/html; charset=utf-8", FileName(cv.Name, "html")),
            "json" => Results.File(
                Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cv.Document, new JsonSerializerOptions { WriteIndented = true })),
                "application/json",
                FileName(cv.Name, "json")),
            _ => Results.BadRequest(),
        };
    }

    private static string FileName(string cvName, string extension) => $"{cvName}.{extension}".Replace(' ', '-');
}
