using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CvForge.Api.Domain;
using CvForge.Tests.Infrastructure;

namespace CvForge.Tests;

[Collection("Database collection")]
public class OfferCvsTests(DatabaseFixture fixture)
{
    private record Summary(Guid Id, string Name, Guid? JobOfferId);
    private record LinkedCv(Guid Id, string Name, string Language, int? Score);
    private record OfferDto(Guid Id, OfferDocument Document, List<LinkedCv> Cvs);
    private record MatchDto(int? Score, List<string> Found, List<string> Missing);

    private static async Task<Summary> NewCvAsync(HttpClient client, string name, CvDocument? doc = null)
    {
        var r = await client.PostAsJsonAsync("/api/cvs", new { name, document = doc });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await r.Content.ReadFromJsonAsync<Summary>())!;
    }

    private static async Task<OfferDto> NewOfferAsync(HttpClient client, string title = "Tech Lead", string[]? techs = null)
    {
        var r = await client.PostAsJsonAsync("/api/offers", new OfferDocument { Title = title, Technologies = (techs ?? []).ToList() });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await r.Content.ReadFromJsonAsync<OfferDto>())!;
    }

    private static Task<HttpResponseMessage> CreateCvsAsync(HttpClient c, Guid offerId, params object[] items) =>
        c.PostAsJsonAsync($"/api/offers/{offerId}/cvs", new { items });

    [Fact]
    public async Task CreateCvs_TwoBases_CreatesTwoLinkedCopies()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var base1 = await NewCvAsync(client, "Base FR");
        var base2 = await NewCvAsync(client, "Base EN", new CvDocument { Settings = new CvSettings { CvLanguage = "en" } });
        var offer = await NewOfferAsync(client);

        var r = await CreateCvsAsync(client, offer.Id,
            new { baseCvId = base1.Id, name = "  Mon CV  " }, new { baseCvId = base2.Id, name = "" });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var created = (await r.Content.ReadFromJsonAsync<List<Summary>>())!;
        Assert.Equal(2, created.Count);
        Assert.All(created, c => Assert.Equal(offer.Id, c.JobOfferId));
        Assert.Equal("Mon CV", created[0].Name);
        Assert.Equal("Base EN – Tech Lead", created[1].Name);

        var got = await client.GetFromJsonAsync<OfferDto>($"/api/offers/{offer.Id}");
        Assert.Equal(2, got!.Cvs.Count);
        Assert.Contains(got.Cvs, c => c.Language == "en");

        var baseJson = await client.GetFromJsonAsync<JsonElement>($"/api/cvs/{base1.Id}");
        Assert.Equal(JsonValueKind.Null, baseJson.GetProperty("jobOfferId").ValueKind);
    }

    [Fact]
    public async Task CreateCvs_EmptyItems_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var offer = await NewOfferAsync(client);
        Assert.Equal(HttpStatusCode.BadRequest, (await CreateCvsAsync(client, offer.Id)).StatusCode);
    }

    [Fact]
    public async Task CreateCvs_OneBaseNotOwned_Returns404AndCreatesNothing()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var stranger = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var mine = await NewCvAsync(client, "Mine");
        var theirs = await NewCvAsync(stranger, "Theirs");
        var offer = await NewOfferAsync(client);

        var r = await CreateCvsAsync(client, offer.Id, new { baseCvId = mine.Id }, new { baseCvId = theirs.Id });

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Single((await client.GetFromJsonAsync<List<Summary>>("/api/cvs"))!);
    }

    [Fact]
    public async Task Match_ReturnsFoundAndMissing()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var cv = await NewCvAsync(client, "C", new CvDocument { SkillCategories = [new SkillCategory { Skills = ["Kafka"] }] });
        var offer = await NewOfferAsync(client, techs: ["Kafka", "PostgreSQL"]);

        var m = await client.GetFromJsonAsync<MatchDto>($"/api/offers/{offer.Id}/match/{cv.Id}");

        Assert.Equal(50, m!.Score);
        Assert.Equal(["Kafka"], m.Found);
        Assert.Equal(["PostgreSQL"], m.Missing);
    }

    [Fact]
    public async Task DeleteOffer_KeepsCvsAndUnlinksThem()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var cv = await NewCvAsync(client, "Base");
        var offer = await NewOfferAsync(client);
        var copy = (await (await CreateCvsAsync(client, offer.Id, new { baseCvId = cv.Id })).Content.ReadFromJsonAsync<List<Summary>>())![0];

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/offers/{offer.Id}")).StatusCode);

        var json = await client.GetFromJsonAsync<JsonElement>($"/api/cvs/{copy.Id}");
        Assert.Equal(JsonValueKind.Null, json.GetProperty("jobOfferId").ValueKind);
    }

    [Fact]
    public async Task DuplicateTailoredCv_CopyIsUnlinked()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var cv = await NewCvAsync(client, "Base");
        var offer = await NewOfferAsync(client);
        var copy = (await (await CreateCvsAsync(client, offer.Id, new { baseCvId = cv.Id })).Content.ReadFromJsonAsync<List<Summary>>())![0];

        var dup = (await (await client.PostAsync($"/api/cvs/{copy.Id}/duplicate", null)).Content.ReadFromJsonAsync<Summary>())!;

        Assert.Null(dup.JobOfferId);
        var list = await client.GetFromJsonAsync<List<Summary>>("/api/cvs");
        Assert.Null(list!.Single(c => c.Id == dup.Id).JobOfferId);
        Assert.Equal(offer.Id, list.Single(c => c.Id == copy.Id).JobOfferId);
    }

    [Fact]
    public async Task PutTailoredCv_KeepsLink()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var cv = await NewCvAsync(client, "Base");
        var offer = await NewOfferAsync(client);
        var copy = (await (await CreateCvsAsync(client, offer.Id, new { baseCvId = cv.Id })).Content.ReadFromJsonAsync<List<Summary>>())![0];

        var doc = (await client.GetFromJsonAsync<JsonElement>($"/api/cvs/{copy.Id}")).GetProperty("document");
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/cvs/{copy.Id}", doc)).StatusCode);

        var after = await client.GetFromJsonAsync<JsonElement>($"/api/cvs/{copy.Id}");
        Assert.Equal(offer.Id, after.GetProperty("jobOfferId").GetGuid());
    }

    [Fact]
    public async Task DeleteAccount_WithOfferAndLinkedCv_Succeeds()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var cv = await NewCvAsync(client, "Base");
        var offer = await NewOfferAsync(client);
        await CreateCvsAsync(client, offer.Id, new { baseCvId = cv.Id });

        var req = new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me")
        {
            Content = JsonContent.Create(new { password = TestUser.Password }),
        };
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(req)).StatusCode);
    }

    [Fact]
    public async Task AdminDeleteUser_WithOfferAndLinkedCv_Succeeds()
    {
        var (admin, _, _) = await TestUser.CreateAuthenticatedAdminClientWithEmailAsync(fixture.Factory);
        var (victim, _) = await TestUser.CreateAuthenticatedClientWithEmailAsync(fixture.Factory);
        var cv = await NewCvAsync(victim, "Base");
        var offer = await NewOfferAsync(victim);
        await CreateCvsAsync(victim, offer.Id, new { baseCvId = cv.Id });
        var me = await victim.GetFromJsonAsync<JsonElement>("/api/auth/me");
        var victimId = me.GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.OK, (await admin.DeleteAsync($"/api/admin/users/{victimId}")).StatusCode);
    }

    [Fact]
    public async Task CreateOffer_InvalidDocument_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var r = await client.PostAsJsonAsync("/api/offers", new OfferDocument { Status = "bogus" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task UpdateOffer_NullSteps_Returns400()
    {
        var client = await TestUser.CreateAuthenticatedClientAsync(fixture.Factory);
        var offer = await NewOfferAsync(client);
        var r = await client.PutAsync($"/api/offers/{offer.Id}",
            new StringContent("{\"steps\":null}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }
}
