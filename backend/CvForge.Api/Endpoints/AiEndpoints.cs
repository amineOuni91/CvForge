using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Api.Endpoints;

public static class AiEndpoints
{
    public static void MapAiEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapGet("/status", (AiService ai) => Results.Ok(new { available = ai.IsAvailable }));

        group.MapPost("/improve-text", async (ImproveTextRequest request, AiService ai) =>
        {
            if (!ai.IsAvailable) return DegradedResponse();
            var result = await ai.ImproveTextAsync(request.Text);
            return Results.Ok(new { result });
        });

        group.MapPost("/bullet-points", async (BulletPointsRequest request, AiService ai) =>
        {
            if (!ai.IsAvailable) return DegradedResponse();
            var result = await ai.GenerateBulletPointsAsync(request.Text);
            return Results.Ok(new { result });
        });

        group.MapPost("/summary", async (SummaryRequest request, AiService ai) =>
        {
            if (!ai.IsAvailable) return DegradedResponse();
            var result = await ai.GenerateSummaryAsync(request.Document);
            return Results.Ok(new { result });
        });

        group.MapPost("/analyze", async (SummaryRequest request, AiService ai) =>
        {
            // scores are always deterministic C# rules (reproducible, explainable — never an LLM
            // guess); only the natural-language recommendations need AI, with a rule-based
            // fallback so the analysis is still useful in degraded mode
            var analysis = AtsAnalyzer.Analyze(request.Document);

            List<string> recommendations;
            if (ai.IsAvailable)
            {
                var rulesSummary = string.Join('\n', analysis.Rules.Select(r => $"- [{(r.Passed ? "OK" : "À corriger")}] {r.Rule} : {r.Detail}"));
                var text = await ai.GenerateRecommendationsAsync(rulesSummary);
                recommendations = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            }
            else
            {
                recommendations = analysis.Rules.Where(r => !r.Passed).Select(r => r.Detail).ToList();
            }

            return Results.Ok(new
            {
                analysis.AtsScore,
                analysis.ContentScore,
                analysis.TechnicalSkillsScore,
                analysis.ExperienceScore,
                analysis.OverallScore,
                recommendations,
            });
        });
    }

    private static IResult DegradedResponse() =>
        Results.Json(
            new { error = "Assistant IA indisponible : configurez ANTHROPIC_API_KEY pour l'activer." },
            statusCode: StatusCodes.Status503ServiceUnavailable);
}

public record ImproveTextRequest(string Text);
public record BulletPointsRequest(string Text);
public record SummaryRequest(CvDocument Document);
