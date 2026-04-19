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

    // ─── User Resolution ──────────────────────────────────────────────────────

    /// <summary>
    /// Resolves the current user from the token's provider and email claims.
    /// Scoped by both provider AND email to prevent cross-provider identity confusion.
    /// </summary>
    protected async Task<Models.User?> GetCurrentUserAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email)
                 ?? User.FindFirstValue("preferred_username")
                 ?? User.FindFirstValue("upn")
                 ?? User.FindFirstValue("email");

        if (string.IsNullOrEmpty(email)) return null;

        var issuer   = User.FindFirstValue("iss") ?? "";
        var provider = issuer.Contains("accounts.google.com",       StringComparison.OrdinalIgnoreCase) ? "google"
                     : issuer.Contains("login.microsoftonline.com", StringComparison.OrdinalIgnoreCase) ? "microsoft"
                     : issuer == "jaywiki-api"                                                          ? "local"
                     : "unknown";

        var identity = await _context.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Provider == provider && i.ProviderEmail == email);

        return identity?.User;
    }

    // ─── Authorization Helpers ────────────────────────────────────────────────

    /// <summary>
    /// Returns true if userId is the direct owner of the project (Project.UserId).
    /// </summary>
    protected async Task<bool> IsProjectOwnerAsync(int projectId, int userId)
    {
        return await _context.Projects
            .AnyAsync(p => p.ProjectId == projectId && p.UserId == userId);
    }

    /// <summary>
    /// Returns true if userId is the owner OR an active collaborator on the project.
    /// </summary>
    protected async Task<bool> IsProjectMemberAsync(int projectId, int userId)
    {
        var isOwner = await _context.Projects
            .AnyAsync(p => p.ProjectId == projectId && p.UserId == userId);

        if (isOwner) return true;

        return await _context.ProjectCollaborators
            .AnyAsync(pc => pc.ProjectId == projectId && pc.UserId == userId);
    }

    /// <summary>
    /// Returns true if the given userId holds the "instructor" or "admin" role.
    /// Used by controllers that have already resolved the current user.
    /// </summary>
    protected async Task<bool> IsInstructorOrAdminAsync(int userId)
    {
        return await _context.Users
            .AnyAsync(u => u.UserId == userId && (u.Role == "instructor" || u.Role == "admin"));
    }

    /// <summary>
    /// No-arg overload — resolves the current user internally then checks role.
    /// Preserves compatibility with CourseCatalogController and CourseEnrollmentsController
    /// which call IsInstructorOrAdminAsync() without a pre-resolved user.
    /// </summary>
    protected async Task<bool> IsInstructorOrAdminAsync()
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return false;
        return await IsInstructorOrAdminAsync(currentUser.UserId);
    }
}