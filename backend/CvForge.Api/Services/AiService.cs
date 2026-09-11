using System.Text;
using System.Text.Json;
using Anthropic;
using Anthropic.Core;
using Anthropic.Models.Messages;
using CvForge.Api.Domain;

namespace CvForge.Api.Services;

/// <summary>
/// Wraps the Anthropic SDK. Degrades gracefully (IsAvailable = false) when no API key is
/// configured — callers (AiEndpoints) return 503 in that case instead of crashing.
/// </summary>
public class AiService
{
    private const string SystemPrompt =
        "Tu es un assistant de rédaction de CV. Reformule ou synthétise UNIQUEMENT le texte fourni par l'utilisateur. " +
        "N'ajoute jamais une technologie, un employeur, un diplôme, une date ou un chiffre absent de l'entrée. " +
        "Réponds uniquement avec le texte demandé, sans préambule ni explication.";

    private readonly IAnthropicClient? _client;

    public AiService(IConfiguration configuration)
    {
        var apiKey = configuration["Anthropic:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _client = new AnthropicClient(new ClientOptions { ApiKey = apiKey });
        }
    }

    public bool IsAvailable => _client is not null;

    public async Task<string> ImproveTextAsync(string text, CancellationToken ct = default)
    {
        var message = await CreateAsync(
            $"Reformule ce texte de CV de façon plus professionnelle et percutante, sans rien inventer :\n\n{text}", ct);
        return ExtractText(message);
    }

    public async Task<string[]> GenerateBulletPointsAsync(string text, CancellationToken ct = default)
    {
        var prompt =
            "À partir de cette description d'expérience, génère 3 à 5 réalisations sous forme de puces concises, " +
            "sans inventer de chiffres ni de faits absents. Réponds strictement avec un tableau JSON de chaînes, " +
            $"exemple : [\"...\", \"...\"].\n\nDescription :\n{text}";
        var message = await CreateAsync(prompt, ct);
        return ParseJsonStringArray(ExtractText(message));
    }

    public async Task<string> GenerateSummaryAsync(CvDocument document, CancellationToken ct = default)
    {
        var prompt =
            "Rédige un profil professionnel (résumé de CV) de 3 à 4 phrases à partir UNIQUEMENT de ces informations, " +
            $"sans rien inventer :\n\n{BuildSummaryContext(document)}";
        var message = await CreateAsync(prompt, ct);
        return ExtractText(message);
    }

    /// <summary>
    /// Structures raw text extracted from an imported PDF/DOCX into a CvDocument. Extraction is
    /// never 100% reliable — the caller (ImportEndpoints) never persists this directly; the user
    /// reviews every field on a verification screen before it becomes a real CV.
    /// </summary>
    public async Task<CvDocument> StructureCvFromTextAsync(string rawText, CancellationToken ct = default)
    {
        if (_client is null) throw new InvalidOperationException("AI not configured");

        var prompt =
            "Voici le texte brut extrait d'un CV existant (PDF ou DOCX). Structure-le en JSON strict correspondant " +
            "exactement à ce schéma TypeScript, sans ajouter aucune information absente du texte source (laisse les " +
            "champs vides ou tableaux vides plutôt que d'inventer) :\n\n" +
            "{ templateKey: string, settings: { primaryColor: string, secondaryColor: string, fontFamily: string, " +
            "fontScale: number, spacing: string, cvLanguage: 'fr'|'en', sectionOrder: string[], hiddenSections: string[] }, " +
            "personalInfo: { firstName, lastName, jobTitle, email, phone, city, country, linkedIn, gitHub, portfolio, website: string }, " +
            "summary: string, " +
            "experiences: { position, company, city, country, startDate, endDate, description: string, isCurrent: boolean, technologies, missions, achievements: string[] }[], " +
            "projects: { name, description, role, url, date: string, technologies: string[] }[], " +
            "education: { degree, school, city, country, graduationYear, description: string }[], " +
            "skillCategories: { name: string, skills: string[] }[], " +
            "languages: { name, level: string }[], " +
            "certifications: { name, issuer, date, url: string }[], " +
            "interests: string[] }\n\n" +
            "Dates au format \"YYYY-MM\". Réponds strictement avec le JSON, sans texte autour.\n\n" +
            $"Texte source :\n{rawText}";

        var message = await CreateAsync(prompt, ct);
        var raw = ExtractText(message);

        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            throw new InvalidOperationException("L'IA n'a pas renvoyé de JSON exploitable.");
        }

        var document = JsonSerializer.Deserialize<CvDocument>(
            raw[start..(end + 1)],
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        return document ?? throw new InvalidOperationException("Structuration IA invalide.");
    }

    /// <summary>Turns deterministic ATS rule results (Phase 12) into natural-language recommendations.</summary>
    public async Task<string> GenerateRecommendationsAsync(string rulesSummary, CancellationToken ct = default)
    {
        var prompt =
            "Voici les résultats d'une analyse ATS déterministe d'un CV. Rédige 3 à 5 recommandations concrètes " +
            $"en langage naturel pour l'améliorer, uniquement basées sur ces résultats :\n\n{rulesSummary}";
        var message = await CreateAsync(prompt, ct);
        return ExtractText(message);
    }

    private async Task<Message> CreateAsync(string userText, CancellationToken ct)
    {
        if (_client is null) throw new InvalidOperationException("AI not configured");
        return await _client.Messages.Create(new MessageCreateParams
        {
            Model = Model.ClaudeOpus5,
            MaxTokens = 1024,
            System = SystemPrompt,
            Messages = [new MessageParam { Role = Role.User, Content = userText }],
        }, ct);
    }

    private static string ExtractText(Message message)
    {
        foreach (var block in message.Content)
        {
            if (block.Value is TextBlock textBlock) return textBlock.Text;
        }
        return string.Empty;
    }

    private static string[] ParseJsonStringArray(string raw)
    {
        try
        {
            var start = raw.IndexOf('[');
            var end = raw.LastIndexOf(']');
            if (start >= 0 && end > start)
            {
                var items = JsonSerializer.Deserialize<string[]>(raw[start..(end + 1)]);
                if (items is not null) return items;
            }
        }
        catch (JsonException)
        {
            // fall through to the raw-text fallback below
        }
        return [raw];
    }

    private static string BuildSummaryContext(CvDocument document)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Poste visé : {document.PersonalInfo.JobTitle}");

        if (document.Experiences.Count > 0)
        {
            sb.AppendLine("Expériences :");
            foreach (var exp in document.Experiences)
            {
                var end = exp.IsCurrent ? "présent" : exp.EndDate;
                sb.AppendLine($"- {exp.Position} chez {exp.Company} ({exp.StartDate} - {end}) : {exp.Description}");
            }
        }

        if (document.SkillCategories.Count > 0)
        {
            var skills = document.SkillCategories.SelectMany(c => c.Skills);
            sb.AppendLine("Compétences : " + string.Join(", ", skills));
        }

        return sb.ToString();
    }
}
