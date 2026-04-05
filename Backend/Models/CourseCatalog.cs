namespace Backend.Models;

public class CourseCatalog
{
    public int CatalogId { get; set; }
    public string CourseCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public int? Credits { get; set; }
    public string? Description { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedBy { get; set; } = null!;
    public ICollection<Course> Courses { get; set; } = new List<Course>();
}