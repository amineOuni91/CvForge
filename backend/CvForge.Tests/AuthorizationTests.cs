using System.Net;
using System.Net.Http.Json;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

/// <summary>
/// Critical: a CV belonging to user A must never be readable, writable, or deletable by user B.
/// This must always return 404 (never 403, which would confirm the CV's existence to a stranger).
/// </summary>
[Collection("Database collection")]
public class AuthorizationTests(DatabaseFixture fixture)
{
    [Fact]
    public async Task GetCv_OwnedByAnotherUser_Returns404NotForbidden()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await stranger.GetAsync($"/api/cvs/{cv!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateCv_OwnedByAnotherUser_Returns404()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();
        var ownedDoc = await (await owner.GetAsync($"/api/cvs/{cv!.Id}")).Content.ReadFromJsonAsync<CvDto>();

        var response = await stranger.PutAsJsonAsync($"/api/cvs/{cv.Id}", ownedDoc!.Document);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteCv_OwnedByAnotherUser_Returns404AndCvSurvives()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        var deleteResponse = await stranger.DeleteAsync($"/api/cvs/{cv!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);

        var stillThere = await owner.GetAsync($"/api/cvs/{cv.Id}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
    }

    [Fact]
    public async Task RenameCv_OwnedByAnotherUser_Returns404()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await stranger.PatchAsJsonAsync($"/api/cvs/{cv!.Id}/name", new { name = "Hijacked" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListCvs_OnlyReturnsCallersOwnCvs()
    {
        var userA = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var userB = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await userA.PostAsJsonAsync("/api/cvs", new { name = "User A's CV" });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        var userBList = await userB.GetFromJsonAsync<List<CvSummaryDto>>("/api/cvs");

        Assert.DoesNotContain(userBList!, c => c.Id == cv!.Id);
    }

    [Fact]
    public async Task UploadPhoto_OwnedByAnotherUser_Returns404()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0]);
        content.Add(fileContent, "file", "photo.jpg");

        var response = await stranger.PostAsync($"/api/cvs/{cv!.Id}/photo", content);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeletePhoto_OwnedByAnotherUser_Returns404()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/cvs", new { });
        var cv = await create.Content.ReadFromJsonAsync<CvSummaryDto>();

        var response = await stranger.DeleteAsync($"/api/cvs/{cv!.Id}/photo");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CvEndpoints_WithoutToken_Return401()
    {
        var anonymous = fixture.Factory.CreateClient();

        var response = await anonymous.GetAsync("/api/cvs");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetLetter_OwnedByAnotherUser_Returns404NotForbidden()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/letters", new { });
        var letter = await create.Content.ReadFromJsonAsync<LetterSummaryDto>();

        var response = await stranger.GetAsync($"/api/letters/{letter!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateLetter_OwnedByAnotherUser_Returns404()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/letters", new { });
        var letter = await create.Content.ReadFromJsonAsync<LetterSummaryDto>();
        var ownedDoc = await (await owner.GetAsync($"/api/letters/{letter!.Id}")).Content.ReadFromJsonAsync<LetterDto>();

        var response = await stranger.PutAsJsonAsync($"/api/letters/{letter.Id}", ownedDoc!.Document);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteLetter_OwnedByAnotherUser_Returns404AndLetterSurvives()
    {
        var owner = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await owner.PostAsJsonAsync("/api/letters", new { });
        var letter = await create.Content.ReadFromJsonAsync<LetterSummaryDto>();

        var deleteResponse = await stranger.DeleteAsync($"/api/letters/{letter!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);

        var stillThere = await owner.GetAsync($"/api/letters/{letter.Id}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
    }

    [Fact]
    public async Task ListLetters_OnlyReturnsCallersOwnLetters()
    {
        var userA = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var userB = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);

        var create = await userA.PostAsJsonAsync("/api/letters", new { name = "User A's letter" });
        var letter = await create.Content.ReadFromJsonAsync<LetterSummaryDto>();

        var userBList = await userB.GetFromJsonAsync<List<LetterSummaryDto>>("/api/letters");

        Assert.DoesNotContain(userBList!, l => l.Id == letter!.Id);
    }

    [Fact]
    public async Task LetterEndpoints_WithoutToken_Return401()
    {
        var anonymous = fixture.Factory.CreateClient();

        var response = await anonymous.GetAsync("/api/letters");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record CvSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record CvDto(Guid Id, string Name, object Document, DateTime CreatedAt, DateTime UpdatedAt);
    private record LetterSummaryDto(Guid Id, string Name, DateTime CreatedAt, DateTime UpdatedAt);
    private record LetterDto(Guid Id, string Name, object Document, DateTime CreatedAt, DateTime UpdatedAt);
}
