namespace Backend.Models;

public class Event
{
    public int EventId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty; // "club", "sport", "academic", "other"
    public DateTime EventDate { get; set; }

    // Navigation properties
    public ICollection<EventRegistration> EventRegistrations { get; set; } = new List<EventRegistration>();
    public ICollection<EventMedia> EventMedias { get; set; } = new List<EventMedia>();
    public ICollection<Award> Awards { get; set; } = new List<Award>();
}