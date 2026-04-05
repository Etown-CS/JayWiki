namespace Backend.Models;

public class UserIdentity
{
    public int IdentityId { get; set; }
    public int UserId { get; set; }
    public string Provider { get; set; } = string.Empty;     // "google" | "microsoft" | "local"
    public string ProviderEmail { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }                // only for "local" provider
    public bool IsPrimary { get; set; } = false;
    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}