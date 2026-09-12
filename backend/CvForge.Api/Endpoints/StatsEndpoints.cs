using CvForge.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Endpoints;

public static class StatsEndpoints
{
    public static void MapStatsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/cv-count", async (AppDbContext db) =>
        {
            var count = await db.Cvs.CountAsync();
            return Results.Ok(new { count });
        });
    }
}
