namespace Backend.Models;

public class Project
{
    public int ProjectId { get; set; }
    public int ClassId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string Status { get; set; } = "active"; // "active", "completed", "archived"
    public string? GithubUrl { get; set; }
    public string? DemoUrl { get; set; }

    // Navigation properties
    public Class Class { get; set; } = null!;
    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<ProjectMedia> ProjectMedia { get; set; } = new List<ProjectMedia>();
}