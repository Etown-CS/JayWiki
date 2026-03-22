namespace Backend.Models;

public class EventMedia
{
    public int EventMediaId { get; set; }
    public int EventId { get; set; }
    public string MediaType { get; set; } = string.Empty; // "image", "video", "link"
    public string Url { get; set; } = string.Empty;

    // Navigation properties
    public Event Event { get; set; } = null!;
}