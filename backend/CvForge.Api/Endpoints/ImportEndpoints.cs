using System.Text.Json;
using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Api.Endpoints;

public static class ImportEndpoints
{
    public static void MapImportEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        // Re-import of CvForge's own JSON export: it's already a CvDocument (same shape
        // produced by GET /export/json), so no text extraction or AI structuring needed.
        group.MapPost("/", async (HttpRequest request) =>
        {
            if (!request.HasFormContentType) return Results.BadRequest(new { error = "Requête multipart attendue." });

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { error = "Aucun fichier fourni." });
            }

            if (Path.GetExtension(file.FileName).ToLowerInvariant() != ".json")
            {
                return Results.BadRequest(new { error = "Format non supporté. Seul le JSON exporté depuis CvForge est accepté." });
            }

            if (file.Length > FileValidator.MaxImportSizeBytes)
            {
                return Results.BadRequest(new { error = "Fichier trop volumineux (5 Mo maximum)." });
            }

            await using var stream = file.OpenReadStream();
            try
            {
                var imported = await JsonSerializer.DeserializeAsync<CvDocument>(stream);
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
}
