namespace Backend.Models;

public class Job
{
    public int JobId { get; set; }
    public int UserId { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Description { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
}