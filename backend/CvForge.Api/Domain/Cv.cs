namespace CvForge.Api.Domain;

public class Cv
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string UserId { get; set; }
    public string Name { get; set; } = "Nouveau CV";
    public CvDocument Document { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
