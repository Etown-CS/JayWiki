namespace Backend.Models;

public class Topic
{
    public int TopicId { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation properties
    public Project Project { get; set; } = null!;
}