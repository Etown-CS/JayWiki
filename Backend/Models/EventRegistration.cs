namespace Backend.Models;

public class EventRegistration
{
    public int EventRegistrationId { get; set; }
    public int UserId { get; set; }
    public int EventId { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
}