using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Api.Endpoints;

public static class AtsEndpoints
{
    public static void MapAtsEndpoints(this RouteGroupBuilder group)
    {
        group.RequireAuthorization();

        group.MapPost("/analyze", (AnalyzeRequest request) =>
        {
            var analysis = AtsAnalyzer.Analyze(request.Document);
            var recommendations = analysis.Rules.Where(r => !r.Passed).Select(r => r.Detail).ToList();

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
}

public record AnalyzeRequest(CvDocument Document);
