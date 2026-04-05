namespace Backend.Models;

public class Course
{
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public int CatalogId { get; set; }
    public string Semester { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Instructor { get; set; }

    public User User { get; set; } = null!;
    public CourseCatalog Catalog { get; set; } = null!;
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}