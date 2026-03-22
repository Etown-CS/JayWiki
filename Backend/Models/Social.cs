namespace Backend.Models;

public class Social
{
    public int SocialId { get; set; }
    public int UserId { get; set; }
    public string Platform { get; set; } = string.Empty; // "github", "linkedin", etc.
    public string Url { get; set; } = string.Empty;
    public string? Username { get; set; }
    public bool Verified { get; set; } = false;

    // Navigation properties
    public User User { get; set; } = null!;
}