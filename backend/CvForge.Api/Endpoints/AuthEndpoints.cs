using System.Security.Claims;
using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/me", (ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = userManager.GetUserAsync(principal).GetAwaiter().GetResult();
            return user is null
                ? Results.NotFound()
                : Results.Ok(new { user.Id, user.Email, user.DisplayName });
        }).RequireAuthorization();

        group.MapPatch("/me", async (UpdateDisplayNameRequest request, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null) return Results.NotFound();

            user.DisplayName = request.DisplayName;
            await userManager.UpdateAsync(user);
            return Results.Ok(new { user.Id, user.Email, user.DisplayName });
        }).RequireAuthorization();
    }
}

public record UpdateDisplayNameRequest(string DisplayName);
