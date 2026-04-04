namespace Backend.Models;

public class User
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AuthProvider { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; }

    public string? ProfileImageUrl { get; set; }

    // Navigation properties
    public ICollection<Job> Jobs { get; set; } = new List<Job>();
    public ICollection<Social> Socials { get; set; } = new List<Social>();
    public ICollection<Course> Courses { get; set; } = new List<Course>();
    public ICollection<EventRegistration> EventRegistrations { get; set; } = new List<EventRegistration>();

    public ICollection<Project> Projects { get; set; } = [];
}