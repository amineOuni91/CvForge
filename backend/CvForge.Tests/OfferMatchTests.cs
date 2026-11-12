using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Tests;

public class OfferMatchTests
{
    private static CvDocument Cv(string summary = "", string[]? skills = null, string[]? expTech = null, string[]? projTech = null)
    {
        var cv = new CvDocument { Summary = summary };
        if (skills is not null) cv.SkillCategories.Add(new SkillCategory { Skills = skills.ToList() });
        if (expTech is not null) cv.Experiences.Add(new Experience { Technologies = expTech.ToList() });
        if (projTech is not null) cv.Projects.Add(new Project { Technologies = projTech.ToList() });
        return cv;
    }

    [Fact]
    public void MatchOffer_FindsTechInSkillsCaseInsensitive()
    {
        var r = AtsAnalyzer.MatchOffer(Cv(skills: ["dotnet", "kafka"]), ["Kafka", "PostgreSQL"]);
        Assert.Equal(50, r.Score);
        Assert.Equal(["Kafka"], r.Found);
        Assert.Equal(["PostgreSQL"], r.Missing);
    }

    [Fact]
    public void MatchOffer_FindsTechInExperienceAndProjectTags()
    {
        var r = AtsAnalyzer.MatchOffer(Cv(expTech: ["Docker"], projTech: ["Angular"]), ["docker", "ANGULAR"]);
        Assert.Equal(100, r.Score);
    }

    [Fact]
    public void MatchOffer_FindsTechAsWholeTokenInSummary()
    {
        var r = AtsAnalyzer.MatchOffer(Cv("Tech lead C# et .NET, architectures Kafka."), ["C#", ".NET", "Kafka"]);
        Assert.Equal(100, r.Score);
    }

    [Fact]
    public void MatchOffer_DoesNotMatchInsideOtherWords()
    {
        var r = AtsAnalyzer.MatchOffer(Cv("Ex-Google, expert React"), ["Go", "R", "Act"]);
        Assert.Equal(0, r.Score);
        Assert.Equal(3, r.Missing.Count);
    }

    [Fact]
    public void MatchOffer_NoTechnologies_ReturnsNullScore()
    {
        foreach (var offer in new[] { Array.Empty<string>(), ["  "] })
        {
            var r = AtsAnalyzer.MatchOffer(Cv(), offer);
            Assert.Null(r.Score);
            Assert.Empty(r.Found);
            Assert.Empty(r.Missing);
        }
    }

    [Fact]
    public void MatchOffer_DeduplicatesOfferTechnologies()
    {
        var r = AtsAnalyzer.MatchOffer(Cv(skills: ["Kafka"]), ["Kafka", "kafka"]);
        Assert.Equal(100, r.Score);
        Assert.Equal(["Kafka"], r.Found);
    }
}
