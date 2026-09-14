using System.Text.Json;
using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Api.Endpoints;

public static class ImportEndpoints
{
    // Re-import of CvForge's own JSON export: it's already a CvDocument (same shape
    // produced by GET /export/json), so no text extraction or AI structuring needed.
    public static void MapImportEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapPost("/", async (HttpRequest request) =>
        {
            var (stream, error) = await ReadAndValidateFileAsync(request);
            if (error is not null) return Results.BadRequest(new { error });

            await using var s = stream!;
            try
            {
                var imported = await JsonSerializer.DeserializeAsync<CvDocument>(s);
                return imported is null
                    ? Results.BadRequest(new { error = "Fichier JSON invalide." })
                    : Results.Ok(imported);
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { error = "Fichier JSON invalide ou corrompu." });
            }
        });
    }

    /// <summary>Shared multipart/extension/size validation for CvForge's own JSON re-import
    /// (CV and letter) — deserialization stays type-specific per caller.</summary>
    public static async Task<(Stream? Stream, string? Error)> ReadAndValidateFileAsync(HttpRequest request)
    {
        if (!request.HasFormContentType) return (null, "Requête multipart attendue.");

        var form = await request.ReadFormAsync();
        var file = form.Files.GetFile("file");
        if (file is null || file.Length == 0) return (null, "Aucun fichier fourni.");
        if (Path.GetExtension(file.FileName).ToLowerInvariant() != ".json")
            return (null, "Format non supporté. Seul le JSON exporté depuis CvForge est accepté.");
        if (file.Length > FileValidator.MaxImportSizeBytes) return (null, "Fichier trop volumineux (5 Mo maximum).");

        return (file.OpenReadStream(), null);
    }
}
