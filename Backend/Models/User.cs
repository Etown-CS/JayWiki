namespace Backend.Models;

public class User
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = "student";
    public string? ProfileImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<UserIdentity> Identities { get; set; } = new List<UserIdentity>();
    public ICollection<Job> Jobs { get; set; } = new List<Job>();
    public ICollection<Social> Socials { get; set; } = new List<Social>();
    public ICollection<Course> Courses { get; set; } = new List<Course>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<EventRegistration> EventRegistrations { get; set; } = new List<EventRegistration>();
    public ICollection<ProjectCollaborator> Collaborations { get; set; } = new List<ProjectCollaborator>();
}