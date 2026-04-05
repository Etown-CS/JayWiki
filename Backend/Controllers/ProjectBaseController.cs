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

    // Gets the current user's DB record from their token claims
    protected async Task<Models.User?> GetCurrentUserAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email)
                 ?? User.FindFirstValue("preferred_username")
                 ?? User.FindFirstValue("upn");

        if (string.IsNullOrEmpty(email)) return null;

        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
    }

    // Checks if the current user is the project owner OR a collaborator
    protected async Task<bool> IsProjectMemberAsync(int projectId, int userId)
    {
        var isOwner = await _context.Projects
            .Include(p => p.Course)
            .AnyAsync(p => p.ProjectId == projectId && p.Course!.UserId == userId);

        if (isOwner) return true;

        return await _context.ProjectCollaborators
            .AnyAsync(pc => pc.ProjectId == projectId && pc.UserId == userId);
    }

    // Checks if the current user is the project owner specifically (via Course)
    protected async Task<bool> IsProjectOwnerAsync(int projectId, int userId)
    {
        return await _context.Projects
            .Include(p => p.Course)
            .AnyAsync(p => p.ProjectId == projectId && p.Course!.UserId == userId);
    }
}