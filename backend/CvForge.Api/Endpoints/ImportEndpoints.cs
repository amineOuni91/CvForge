using System.Text.Json;
using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Api.Endpoints;

public static class ImportEndpoints
{
    public static void MapImportEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapPost("/", async (HttpRequest request, AiService ai, ImportService importService) =>
        {
            if (!request.HasFormContentType) return Results.BadRequest(new { error = "Requête multipart attendue." });

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { error = "Aucun fichier fourni." });
            }

            if (file.Length > FileValidator.MaxImportSizeBytes)
            {
                return Results.BadRequest(new { error = "Fichier trop volumineux (5 Mo maximum)." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            await using var stream = file.OpenReadStream();

            // Re-import of CvForge's own JSON export: no text extraction, no AI needed —
            // it's already a CvDocument (same shape produced by GET /export/json).
            if (extension == ".json")
            {
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
            }

            string rawText;
            try
            {
                if (extension == ".pdf" && FileValidator.IsPdf(stream))
                {
                    stream.Position = 0;
                    rawText = ImportService.ExtractTextFromPdf(stream);
                }
                else if (extension == ".docx" && FileValidator.IsDocx(stream))
                {
                    stream.Position = 0;
                    rawText = ImportService.ExtractTextFromDocx(stream);
                }
                else
                {
                    return Results.BadRequest(new { error = "Format non supporté ou fichier corrompu (PDF, DOCX, ou JSON exporté depuis CvForge)." });
                }
            }
            catch (Exception)
            {
                // untrusted upload: a file with valid magic bytes can still be an internally
                // corrupt/malformed PDF or DOCX that the parser throws on — never a 500 for that
                return Results.BadRequest(new { error = "Fichier illisible ou corrompu." });
            }

            if (string.IsNullOrWhiteSpace(rawText))
            {
                return Results.BadRequest(new { error = "Impossible d'extraire du texte de ce fichier." });
            }

            if (!ai.IsAvailable)
            {
                return Results.Json(
                    new { error = "Structuration IA indisponible : configurez ANTHROPIC_API_KEY pour l'activer." },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var document = await importService.StructureAsync(rawText);
            return Results.Ok(document);
        });
    }
}
