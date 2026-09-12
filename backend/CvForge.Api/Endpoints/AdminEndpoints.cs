using System.Security.Claims;
using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace CvForge.Api.Endpoints;

public static class AdminEndpoints
{
    private const string AdminRole = "Admin";

    public static void MapAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/users", async (ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var callerId = userManager.GetUserId(principal)!;
            var users = new List<AdminUserDto>();
            foreach (var user in userManager.Users.Where(u => u.Id != callerId).ToList())
                users.Add(new AdminUserDto(user.Id, user.Email!, user.DisplayName, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
            return Results.Ok(users);
        });

        group.MapPost("/users", async (CreateAdminUserRequest request, UserManager<AppUser> userManager) =>
        {
            var user = new AppUser { UserName = request.Email, Email = request.Email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                return Results.BadRequest(new { error = string.Join(" ", result.Errors.Select(e => e.Description)) });

            if (IsAdminRole(request.Role))
                await userManager.AddToRoleAsync(user, AdminRole);

            return Results.Created($"/api/admin/users/{user.Id}", new AdminUserDto(user.Id, user.Email!, user.DisplayName, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
        });

        group.MapGet("/users/{id}", async (string id, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();
            return Results.Ok(new AdminUserDetailDto(user.Id, user.Email!, user.DisplayName, user.ProfileInfo, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
        });

        group.MapPatch("/users/{id}", async (string id, UpdateAdminUserRequest request, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await userManager.FindByEmailAsync(request.Email);
                if (existing is not null && existing.Id != user.Id)
                    return Results.BadRequest(new { error = "Cet email est déjà utilisé par un autre compte." });

                await userManager.SetEmailAsync(user, request.Email);
                await userManager.SetUserNameAsync(user, request.Email);
            }

            user.DisplayName = request.DisplayName;
            user.ProfileInfo = request.PersonalInfo;
            await userManager.UpdateAsync(user);

            var wantsAdmin = IsAdminRole(request.Role);
            var isAdmin = await userManager.IsInRoleAsync(user, AdminRole);
            if (wantsAdmin && !isAdmin) await userManager.AddToRoleAsync(user, AdminRole);
            if (!wantsAdmin && isAdmin) await userManager.RemoveFromRoleAsync(user, AdminRole);

            return Results.Ok(new AdminUserDetailDto(user.Id, user.Email!, user.DisplayName, user.ProfileInfo, user.EmailConfirmed, await RoleNameAsync(userManager, user)));
        });

        group.MapPost("/users/{id}/reset-password", async (string id, AdminResetPasswordRequest request, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            await userManager.RemovePasswordAsync(user);
            var result = await userManager.AddPasswordAsync(user, request.NewPassword);
            return result.Succeeded
                ? Results.Ok()
                : Results.BadRequest(new { error = string.Join(" ", result.Errors.Select(e => e.Description)) });
        });

        group.MapPost("/users/{id}/activate", async (string id, UserManager<AppUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            user.EmailConfirmed = true;
            await userManager.UpdateAsync(user);
            return Results.Ok();
        });

        group.MapDelete("/users/{id}", async (string id, ClaimsPrincipal principal, UserManager<AppUser> userManager) =>
        {
            var callerId = userManager.GetUserId(principal)!;
            if (id == callerId)
                return Results.BadRequest(new { error = "Impossible de supprimer son propre compte depuis cette interface." });

            var user = await userManager.FindByIdAsync(id);
            if (user is null) return Results.NotFound();

            var result = await userManager.DeleteAsync(user);
            return result.Succeeded ? Results.Ok() : Results.BadRequest(new { error = "Échec de la suppression du compte." });
        });
    }

    private static bool IsAdminRole(string? role) => string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);

    private static async Task<string> RoleNameAsync(UserManager<AppUser> userManager, AppUser user) =>
        await userManager.IsInRoleAsync(user, AdminRole) ? "admin" : "visitor";
}

public record AdminUserDto(string Id, string Email, string DisplayName, bool EmailConfirmed, string Role);
public record AdminUserDetailDto(string Id, string Email, string DisplayName, PersonalInfo ProfileInfo, bool EmailConfirmed, string Role);
public record CreateAdminUserRequest(string Email, string Password, string Role);
public record UpdateAdminUserRequest(string DisplayName, PersonalInfo PersonalInfo, string Email, string Role);
public record AdminResetPasswordRequest(string NewPassword);
