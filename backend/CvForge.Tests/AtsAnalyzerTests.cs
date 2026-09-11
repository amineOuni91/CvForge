using CvForge.Api.Domain;
using CvForge.Api.Services;

namespace CvForge.Tests;

public class AtsAnalyzerTests
{
    private static CvDocument EmptyDocument() => new()
    {
        TemplateKey = "modern",
        PersonalInfo = new PersonalInfo(),
    };

    private static CvDocument WellFormedDocument() => new()
    {
        TemplateKey = "modern",
        Summary = "Software Engineer avec 7 ans d'expérience.",
        PersonalInfo = new PersonalInfo { Email = "a@b.com", Phone = "0600000000" },
        Experiences =
        [
            new Experience
            {
                Position = "Backend Developer",
                Company = "Sopra Steria",
                StartDate = "2021-03",
                IsCurrent = true,
                Description = "Développement backend.",
                Achievements = ["Réduit le temps de build de 40%", "Livré 12 fonctionnalités"],
            },
        ],
        Education = [new EducationEntry { Degree = "Master", School = "EPITA", StartDate = "2015-09", EndDate = "2018-06" }],
        SkillCategories = [new SkillCategory { Name = "Backend", Skills = ["C#", ".NET", "SQL"] }],
        Languages = [new LanguageEntry { Name = "Français", Level = "Native" }],
        Certifications = [new Certification { Name = "AZ-204", Issuer = "Microsoft" }],
    };

    [Fact]
    public void Analyze_IsDeterministic_SameInputSameOutput()
    {
        var doc = WellFormedDocument();

        var first = AtsAnalyzer.Analyze(doc);
        var second = AtsAnalyzer.Analyze(doc);

        Assert.Equal(first.AtsScore, second.AtsScore);
        Assert.Equal(first.ContentScore, second.ContentScore);
        Assert.Equal(first.TechnicalSkillsScore, second.TechnicalSkillsScore);
        Assert.Equal(first.ExperienceScore, second.ExperienceScore);
        Assert.Equal(first.OverallScore, second.OverallScore);
        Assert.Equal(first.Rules.Select(r => (r.Rule, r.Passed)), second.Rules.Select(r => (r.Rule, r.Passed)));
    }

    [Fact]
    public void Analyze_EmptyDocument_HasZeroContentScore()
    {
        var result = AtsAnalyzer.Analyze(EmptyDocument());

        Assert.Equal(0, result.ContentScore);
    }

    [Fact]
    public void Analyze_MissingContactInfo_PenalizesAtsScore()
    {
        var withContact = WellFormedDocument();
        var withoutContact = WellFormedDocument();
        withoutContact.PersonalInfo = new PersonalInfo();

        var scoreWith = AtsAnalyzer.Analyze(withContact).AtsScore;
        var scoreWithout = AtsAnalyzer.Analyze(withoutContact).AtsScore;

        Assert.True(scoreWithout < scoreWith);
    }

    [Fact]
    public void Analyze_PhotoPresent_PenalizesAtsScore()
    {
        var withoutPhoto = WellFormedDocument();
        var withPhoto = WellFormedDocument();
        withPhoto.PersonalInfo.PhotoUrl = "/uploads/x.jpg";

        var scoreWithout = AtsAnalyzer.Analyze(withoutPhoto).AtsScore;
        var scoreWith = AtsAnalyzer.Analyze(withPhoto).AtsScore;

        Assert.True(scoreWith < scoreWithout);
    }

    [Fact]
    public void Analyze_ExecutiveTemplate_PenalizesAtsScoreForMultiColumnLayout()
    {
        var single = WellFormedDocument();
        var multiColumn = WellFormedDocument();
        multiColumn.TemplateKey = "executive";

        var scoreSingle = AtsAnalyzer.Analyze(single).AtsScore;
        var scoreMulti = AtsAnalyzer.Analyze(multiColumn).AtsScore;

        Assert.True(scoreMulti < scoreSingle);
    }

    [Fact]
    public void Analyze_HiddenEssentialSection_PenalizesAtsScore()
    {
        var visible = WellFormedDocument();
        var hidden = WellFormedDocument();
        hidden.Settings.HiddenSections = ["experiences"];

        var scoreVisible = AtsAnalyzer.Analyze(visible).AtsScore;
        var scoreHidden = AtsAnalyzer.Analyze(hidden).AtsScore;

        Assert.True(scoreHidden < scoreVisible);
    }

    [Fact]
    public void Analyze_InconsistentDates_PenalizesAtsScore()
    {
        var consistent = WellFormedDocument();
        var inconsistent = WellFormedDocument();
        inconsistent.Experiences[0].StartDate = "";

        var scoreConsistent = AtsAnalyzer.Analyze(consistent).AtsScore;
        var scoreInconsistent = AtsAnalyzer.Analyze(inconsistent).AtsScore;

        Assert.True(scoreInconsistent < scoreConsistent);
    }

    [Fact]
    public void Analyze_WellFormedDocument_ScoresHigherOverallThanEmpty()
    {
        var empty = AtsAnalyzer.Analyze(EmptyDocument());
        var wellFormed = AtsAnalyzer.Analyze(WellFormedDocument());

        Assert.True(wellFormed.OverallScore > empty.OverallScore);
    }

    [Fact]
    public void Analyze_AllScores_AreWithinZeroToHundredRange()
    {
        var result = AtsAnalyzer.Analyze(WellFormedDocument());

        foreach (var score in new[] { result.AtsScore, result.ContentScore, result.TechnicalSkillsScore, result.ExperienceScore, result.OverallScore })
        {
            Assert.InRange(score, 0, 100);
        }
    }
}
