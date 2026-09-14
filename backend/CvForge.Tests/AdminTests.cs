using System.Net.Http.Json;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class AdminTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task Me_ForOrdinaryUser_ReportsVisitorRole()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");

        Assert.Equal("visitor", me!.Role);
    }

    [Fact]
    public async Task Me_ForAdminUser_ReportsAdminRole()
    {
        var (client, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");

        Assert.Equal("admin", me!.Role);
    }

    [Fact]
    public async Task NonAdmin_CannotAccessAdminRoutes()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListUsers_ExcludesTheCallingAdmin()
    {
        var (client, _, adminId) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);

        var users = await client.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users");

        Assert.DoesNotContain(users!, u => u.Id == adminId);
    }

    [Fact]
    public async Task ListUsers_ReportsCvCountPerUser()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, ownerEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);

        await ownerClient.PostAsJsonAsync("/api/cvs", new { });
        await ownerClient.PostAsJsonAsync("/api/cvs", new { });

        var users = await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users");

        Assert.Equal(2, users!.Single(u => u.Email == ownerEmail).CvCount);
    }

    [Fact]
    public async Task CreateUser_ThenGetOne_ReturnsCreatedAccountConfirmedWithRequestedRole()
    {
        var (client, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var newEmail = $"created-{Guid.NewGuid():N}@example.com";

        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new { email = newEmail, password = "Test123!@#", role = "visitor" });
        Assert.Equal(System.Net.HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<AdminUserDto>();

        Assert.True(created!.EmailConfirmed);
        Assert.Equal("visitor", created.Role);

        var fetched = await client.GetFromJsonAsync<AdminUserDetailDto>($"/api/admin/users/{created.Id}");
        Assert.Equal(newEmail, fetched!.Email);
    }

    [Fact]
    public async Task CreateUser_WithAdminRole_CanImmediatelyAccessAdminRoutesAfterLogin()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var newEmail = $"created-admin-{Guid.NewGuid():N}@example.com";

        var createResponse = await adminClient.PostAsJsonAsync("/api/admin/users", new { email = newEmail, password = "Test123!@#", role = "admin" });
        Assert.Equal(System.Net.HttpStatusCode.Created, createResponse.StatusCode);

        var loginResponse = await fixture.Factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login?useCookies=false", new { email = newEmail, password = "Test123!@#" });
        var tokens = await loginResponse.Content.ReadFromJsonAsync<AccessTokenResponseDto>();

        var newAdminClient = fixture.Factory.CreateClient();
        newAdminClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokens!.AccessToken);

        var response = await newAdminClient.GetAsync("/api/admin/users");
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ChangesDisplayNameEmailAndRole()
    {
        var (client, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var targetEmail = $"target-{Guid.NewGuid():N}@example.com";
        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new { email = targetEmail, password = "Test123!@#", role = "visitor" });
        var targetId = (await createResponse.Content.ReadFromJsonAsync<AdminUserDto>())!.Id;
        var newEmail = $"renamed-{Guid.NewGuid():N}@example.com";
        var personalInfo = new { firstName = "", lastName = "", jobTitle = "", email = "", phone = "", city = "", country = "", linkedIn = "", gitHub = "", portfolio = "", website = "" };

        var response = await client.PatchAsJsonAsync($"/api/admin/users/{targetId}", new { displayName = "Renamed", personalInfo, email = newEmail, role = "admin" });
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.Equal("Renamed", updated!.DisplayName);
        Assert.Equal(newEmail, updated.Email);
        Assert.Equal("admin", updated.Role);
    }

    [Fact]
    public async Task UpdateUser_ToAnEmailAlreadyUsedByAnotherAccount_IsRejected()
    {
        var (client, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (_, existingEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var createResponse = await client.PostAsJsonAsync("/api/admin/users", new { email = $"target-{Guid.NewGuid():N}@example.com", password = "Test123!@#", role = "visitor" });
        var targetId = (await createResponse.Content.ReadFromJsonAsync<AdminUserDto>())!.Id;
        var personalInfo = new { firstName = "", lastName = "", jobTitle = "", email = "", phone = "", city = "", country = "", linkedIn = "", gitHub = "", portfolio = "", website = "" };

        var response = await client.PatchAsJsonAsync($"/api/admin/users/{targetId}", new { displayName = "X", personalInfo, email = existingEmail, role = "visitor" });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_ThenLoginWithNewPassword_Succeeds()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (_, targetEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var targetId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == targetEmail).Id;
        const string newPassword = "BrandNew789!@#";

        var response = await adminClient.PostAsJsonAsync($"/api/admin/users/{targetId}/reset-password", new { newPassword });
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var login = await fixture.Factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login?useCookies=false", new { email = targetEmail, password = newPassword });
        Assert.Equal(System.Net.HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Activate_SetsEmailConfirmedWithoutAnyCode()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (_, targetEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var targetId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == targetEmail).Id;

        var response = await adminClient.PostAsync($"/api/admin/users/{targetId}/activate", null);
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var detail = await adminClient.GetFromJsonAsync<AdminUserDetailDto>($"/api/admin/users/{targetId}");
        Assert.True(detail!.EmailConfirmed);
    }

    [Fact]
    public async Task Deactivate_SetsEmailConfirmedBackToFalse()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (_, targetEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var targetId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == targetEmail).Id;
        await adminClient.PostAsync($"/api/admin/users/{targetId}/activate", null);

        var response = await adminClient.PostAsync($"/api/admin/users/{targetId}/deactivate", null);
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var detail = await adminClient.GetFromJsonAsync<AdminUserDetailDto>($"/api/admin/users/{targetId}");
        Assert.False(detail!.EmailConfirmed);
    }

    [Fact]
    public async Task DeleteUser_RemovesTheAccount()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var createResponse = await adminClient.PostAsJsonAsync("/api/admin/users", new { email = $"todelete-{Guid.NewGuid():N}@example.com", password = "Test123!@#", role = "visitor" });
        var targetId = (await createResponse.Content.ReadFromJsonAsync<AdminUserDto>())!.Id;

        var deleteResponse = await adminClient.DeleteAsync($"/api/admin/users/{targetId}");
        Assert.Equal(System.Net.HttpStatusCode.OK, deleteResponse.StatusCode);

        var getResponse = await adminClient.GetAsync($"/api/admin/users/{targetId}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_CannotDeleteOwnAccount()
    {
        var (adminClient, _, adminId) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);

        var response = await adminClient.DeleteAsync($"/api/admin/users/{adminId}");

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminCanListLoadSaveAndDeleteAnotherUsersCv()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, ownerEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var ownerId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == ownerEmail).Id;

        var createResponse = await ownerClient.PostAsJsonAsync("/api/cvs", new { });
        var cvId = (await createResponse.Content.ReadFromJsonAsync<CvSummaryDto>())!.Id;

        var listResponse = await adminClient.GetFromJsonAsync<List<CvSummaryDto>>($"/api/admin/users/{ownerId}/cvs");
        Assert.Contains(listResponse!, c => c.Id == cvId);

        var loaded = await adminClient.GetFromJsonAsync<CvDto>($"/api/admin/users/{ownerId}/cvs/{cvId}");
        Assert.NotNull(loaded);

        loaded!.Document.Summary = "Edited by admin";
        var saveResponse = await adminClient.PutAsJsonAsync($"/api/admin/users/{ownerId}/cvs/{cvId}", loaded.Document);
        Assert.Equal(System.Net.HttpStatusCode.OK, saveResponse.StatusCode);

        var reloaded = await ownerClient.GetFromJsonAsync<CvDto>($"/api/cvs/{cvId}");
        Assert.Equal("Edited by admin", reloaded!.Document.Summary);

        var deleteResponse = await adminClient.DeleteAsync($"/api/admin/users/{ownerId}/cvs/{cvId}");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getAfterDelete = await ownerClient.GetAsync($"/api/cvs/{cvId}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task AdminCanRenameDuplicateAndExportAnotherUsersCv()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, ownerEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var ownerId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == ownerEmail).Id;
        var createResponse = await ownerClient.PostAsJsonAsync("/api/cvs", new { });
        var cvId = (await createResponse.Content.ReadFromJsonAsync<CvSummaryDto>())!.Id;

        var renameResponse = await adminClient.PatchAsJsonAsync($"/api/admin/users/{ownerId}/cvs/{cvId}/name", new { name = "Renamed by admin" });
        Assert.Equal(System.Net.HttpStatusCode.OK, renameResponse.StatusCode);
        var renamed = await renameResponse.Content.ReadFromJsonAsync<CvSummaryDto>();
        Assert.Equal("Renamed by admin", renamed!.Name);

        var duplicateResponse = await adminClient.PostAsync($"/api/admin/users/{ownerId}/cvs/{cvId}/duplicate", null);
        Assert.Equal(System.Net.HttpStatusCode.Created, duplicateResponse.StatusCode);
        var duplicated = await duplicateResponse.Content.ReadFromJsonAsync<CvSummaryDto>();
        Assert.Equal("Renamed by admin (copie)", duplicated!.Name);

        var ownerCvs = await ownerClient.GetFromJsonAsync<List<CvSummaryDto>>("/api/cvs");
        Assert.Contains(ownerCvs!, c => c.Id == duplicated.Id);

        var exportResponse = await adminClient.GetAsync($"/api/admin/users/{ownerId}/cvs/{cvId}/export/json");
        Assert.Equal(System.Net.HttpStatusCode.OK, exportResponse.StatusCode);
        Assert.StartsWith("application/json", exportResponse.Content.Headers.ContentType!.ToString());
    }

    [Fact]
    public async Task AdminCvRoute_404sWhenTheCvBelongsToADifferentUser()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, _) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var (_, otherEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var otherId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == otherEmail).Id;

        var createResponse = await ownerClient.PostAsJsonAsync("/api/cvs", new { });
        var cvId = (await createResponse.Content.ReadFromJsonAsync<CvSummaryDto>())!.Id;

        // cvId belongs to `ownerClient`'s user, not to `otherId` — the pair must not match
        var response = await adminClient.GetAsync($"/api/admin/users/{otherId}/cvs/{cvId}");

        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AdminCanListLoadSaveAndDeleteAnotherUsersLetter()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, ownerEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var ownerId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == ownerEmail).Id;

        var createResponse = await ownerClient.PostAsJsonAsync("/api/letters", new { });
        var letterId = (await createResponse.Content.ReadFromJsonAsync<LetterSummaryDto>())!.Id;

        var listResponse = await adminClient.GetFromJsonAsync<List<LetterSummaryDto>>($"/api/admin/users/{ownerId}/letters");
        Assert.Contains(listResponse!, l => l.Id == letterId);

        var loaded = await adminClient.GetFromJsonAsync<LetterDto>($"/api/admin/users/{ownerId}/letters/{letterId}");
        Assert.NotNull(loaded);

        loaded!.Document.Subject = "Edited by admin";
        var saveResponse = await adminClient.PutAsJsonAsync($"/api/admin/users/{ownerId}/letters/{letterId}", loaded.Document);
        Assert.Equal(System.Net.HttpStatusCode.OK, saveResponse.StatusCode);

        var reloaded = await ownerClient.GetFromJsonAsync<LetterDto>($"/api/letters/{letterId}");
        Assert.Equal("Edited by admin", reloaded!.Document.Subject);

        var deleteResponse = await adminClient.DeleteAsync($"/api/admin/users/{ownerId}/letters/{letterId}");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getAfterDelete = await ownerClient.GetAsync($"/api/letters/{letterId}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task AdminCanRenameDuplicateAndExportAnotherUsersLetter()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, ownerEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var ownerId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == ownerEmail).Id;
        var createResponse = await ownerClient.PostAsJsonAsync("/api/letters", new { });
        var letterId = (await createResponse.Content.ReadFromJsonAsync<LetterSummaryDto>())!.Id;

        var renameResponse = await adminClient.PatchAsJsonAsync($"/api/admin/users/{ownerId}/letters/{letterId}/name", new { name = "Renamed by admin" });
        Assert.Equal(System.Net.HttpStatusCode.OK, renameResponse.StatusCode);
        var renamed = await renameResponse.Content.ReadFromJsonAsync<LetterSummaryDto>();
        Assert.Equal("Renamed by admin", renamed!.Name);

        var duplicateResponse = await adminClient.PostAsync($"/api/admin/users/{ownerId}/letters/{letterId}/duplicate", null);
        Assert.Equal(System.Net.HttpStatusCode.Created, duplicateResponse.StatusCode);
        var duplicated = await duplicateResponse.Content.ReadFromJsonAsync<LetterSummaryDto>();
        Assert.Equal("Renamed by admin (copie)", duplicated!.Name);

        var ownerLetters = await ownerClient.GetFromJsonAsync<List<LetterSummaryDto>>("/api/letters");
        Assert.Contains(ownerLetters!, l => l.Id == duplicated.Id);

        var exportResponse = await adminClient.GetAsync($"/api/admin/users/{ownerId}/letters/{letterId}/export/json");
        Assert.Equal(System.Net.HttpStatusCode.OK, exportResponse.StatusCode);
        Assert.StartsWith("application/json", exportResponse.Content.Headers.ContentType!.ToString());
    }

    [Fact]
    public async Task AdminLetterRoute_404sWhenTheLetterBelongsToADifferentUser()
    {
        var (adminClient, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (ownerClient, _) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var (_, otherEmail) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var otherId = (await adminClient.GetFromJsonAsync<List<AdminUserDto>>("/api/admin/users"))!
            .Single(u => u.Email == otherEmail).Id;

        var createResponse = await ownerClient.PostAsJsonAsync("/api/letters", new { });
        var letterId = (await createResponse.Content.ReadFromJsonAsync<LetterSummaryDto>())!.Id;

        var response = await adminClient.GetAsync($"/api/admin/users/{otherId}/letters/{letterId}");

        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    private record MeDto(string Id, string Email, string DisplayName, bool EmailConfirmed, string Role);
    private record AdminUserDto(string Id, string Email, string DisplayName, bool EmailConfirmed, string Role, int CvCount);
    private record AdminUserDetailDto(string Id, string Email, string DisplayName, PersonalInfoDto ProfileInfo, bool EmailConfirmed, string Role);
    private record PersonalInfoDto(string FirstName, string LastName, string JobTitle, string Email, string Phone, string City, string Country, string LinkedIn, string GitHub, string Portfolio, string Website);
    private record AccessTokenResponseDto(string TokenType, string AccessToken, int ExpiresIn, string RefreshToken);
    private record CvSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record CvDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt, CvDocumentDto Document);
    private class CvDocumentDto
    {
        public string TemplateKey { get; set; } = "";
        public string Summary { get; set; } = "";
    }
    private record LetterSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record LetterDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt, LetterDocumentDto Document);
    private class LetterDocumentDto
    {
        public string TemplateKey { get; set; } = "";
        public string Subject { get; set; } = "";
    }
}
