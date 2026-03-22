namespace Backend.Models;

public class ProjectMedia
{
    public int ProjectMediaId { get; set; }
    public int ProjectId { get; set; }
    public string MediaType { get; set; } = string.Empty; // "image", "video", "link"
    public string Url { get; set; } = string.Empty;

    // Navigation properties
    public Project Project { get; set; } = null!;
}