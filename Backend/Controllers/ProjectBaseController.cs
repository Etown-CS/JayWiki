using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.Data;

namespace Backend.Controllers;

[ApiController]
public abstract class ProjectBaseController : ControllerBase
{
    protected readonly ApplicationDbContext _context;

    protected ProjectBaseController(ApplicationDbContext context)
    {
        _context = context;
    }

    // Helper method to get the current user based on the JWT claims and linked identities
    protected async Task<Models.User?> GetCurrentUserAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue("preferred_username")
                ?? User.FindFirstValue("upn")
                ?? User.FindFirstValue("email");

        if (string.IsNullOrEmpty(email)) return null;

        var issuer   = User.FindFirstValue("iss") ?? "";
        var provider = issuer.Contains("accounts.google.com", StringComparison.OrdinalIgnoreCase) ? "google"
                    : issuer.Contains("login.microsoftonline.com", StringComparison.OrdinalIgnoreCase) ? "microsoft"
                    : "local";

        var identity = await _context.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Provider == provider && i.ProviderEmail == email);

        return identity?.User;
    }

    // Checks if the current user is the project owner OR a collaborator
    protected async Task<bool> IsProjectMemberAsync(int projectId, int userId)
    {
        var isOwner = await _context.Projects
            .AnyAsync(p => p.ProjectId == projectId && p.UserId == userId);

        if (isOwner) return true;

        return await _context.ProjectCollaborators
            .AnyAsync(pc => pc.ProjectId == projectId && pc.UserId == userId);
    }

    // Checks if the current user is the project owner specifically
    protected async Task<bool> IsProjectOwnerAsync(int projectId, int userId)
    {
        return await _context.Projects
            .AnyAsync(p => p.ProjectId == projectId && p.UserId == userId);
    }

    // Checks if the current user is an instructor or admin (for elevated permissions)
    protected async Task<bool> IsInstructorOrAdminAsync()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return false;
        return currentUser.Role == "instructor" || currentUser.Role == "admin";
    }
}