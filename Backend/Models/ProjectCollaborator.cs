namespace Backend.Models;

public class ProjectCollaborator
{
    public int ProjectCollaboratorId { get; set; }
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}