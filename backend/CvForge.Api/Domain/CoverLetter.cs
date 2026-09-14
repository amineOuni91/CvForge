namespace CvForge.Api.Domain;

public class CoverLetter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string UserId { get; set; }
    public string Name { get; set; } = "Nouvelle lettre";
    public LetterDocument Document { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
