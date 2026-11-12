namespace CvForge.Api.Domain;

public class JobOffer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string UserId { get; set; }
    public OfferDocument Document { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OfferDocument
{
    public string Title { get; set; } = "";
    public string Company { get; set; } = "";
    public string Location { get; set; } = "";
    public string ContractType { get; set; } = "";
    public string Url { get; set; } = "";
    public string Description { get; set; } = "";
    public string Notes { get; set; } = "";
    public List<string> Technologies { get; set; } = [];
    public List<string> Missions { get; set; } = [];
    public List<string> Requirements { get; set; } = [];
    /// <summary>toApply | applied | interview | rejected</summary>
    public string Status { get; set; } = "toApply";
    public List<OfferStep> Steps { get; set; } = [];
}

public class OfferStep
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    /// <summary>cvSent | hrCall | hrInterview | techInterview | techTest | directorInterview | offerReceived | other</summary>
    public string Type { get; set; } = "cvSent";
    public string Label { get; set; } = "";
    /// <summary>Local wall-clock ISO string without offset (e.g. "2026-11-18T10:00"); deliberately not a DateTime.</summary>
    public string? Date { get; set; }
    /// <summary>phone | video | onSite</summary>
    public string Format { get; set; } = "video";
    public string Contact { get; set; } = "";
    public string Place { get; set; } = "";
    public string NoteBefore { get; set; } = "";
    public string NoteAfter { get; set; } = "";
    /// <summary>upcoming | passed | failed | cancelled</summary>
    public string Result { get; set; } = "upcoming";
}
