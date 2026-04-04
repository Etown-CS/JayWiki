namespace Backend.Models;

public class Course
{
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public string CourseCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string Semester { get; set; } = string.Empty; // "Fall", "Spring", "Summer"
    public int Year { get; set; }
    public string? Instructor { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}