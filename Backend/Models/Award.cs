namespace Backend.Models;

public class Award
{
    public int AwardId { get; set; }
    public int EventId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime AwardedAt { get; set; }  = DateTime.UtcNow;

    // Navigation properties
    public Event Event { get; set; } = null!;
}