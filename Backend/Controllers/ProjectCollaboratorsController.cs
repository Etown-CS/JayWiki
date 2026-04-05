using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/projects/{projectId}/collaborators")]
public class ProjectCollaboratorsController : ProjectBaseController
{
    public ProjectCollaboratorsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/projects/{projectId}/collaborators ──────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetCollaborators(int projectId)
    {
        var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
        if (!projectExists)
            return NotFound(new { message = $"Project {projectId} not found." });

        var collaborators = await _context.ProjectCollaborators
            .Where(pc => pc.ProjectId == projectId)
            .Include(pc => pc.User).ThenInclude(u => u.Identities)
            .Select(pc => new
            {
                pc.ProjectCollaboratorId,
                pc.ProjectId,
                pc.UserId,
                pc.User.Name,
                Email = pc.User.Identities
                    .Where(i => i.IsPrimary)
                    .Select(i => i.ProviderEmail)
                    .FirstOrDefault(),
                pc.AddedAt
            })
            .ToListAsync();

        return Ok(collaborators);
    }

    // ─── POST /api/projects/{projectId}/collaborators ─────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> AddCollaborator(int projectId, [FromBody] AddCollaboratorRequest request)
    {
        var project = await _context.Projects
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.ProjectId == projectId);

        if (project == null)
            return NotFound(new { message = $"Project {projectId} not found." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsProjectOwnerAsync(projectId, currentUser.UserId))
            return Forbid();

        // Look up target user via UserIdentity
        var targetIdentity = await _context.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.ProviderEmail == request.Email);

        if (targetIdentity == null)
            return NotFound(new { message = $"No user found with email '{request.Email}'." });

        var targetUser = targetIdentity.User;

        if (targetUser.UserId == currentUser.UserId)
            return BadRequest(new { message = "You are already the project owner." });

        var alreadyCollaborator = await _context.ProjectCollaborators
            .AnyAsync(pc => pc.ProjectId == projectId && pc.UserId == targetUser.UserId);
        if (alreadyCollaborator)
            return Conflict(new { message = $"{request.Email} is already a collaborator on this project." });

        var collaborator = new ProjectCollaborator
        {
            ProjectId = projectId,
            UserId    = targetUser.UserId,
            AddedAt   = DateTime.UtcNow
        };

        _context.ProjectCollaborators.Add(collaborator);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCollaborators),
            new { projectId },
            new
            {
                collaborator.ProjectCollaboratorId,
                collaborator.ProjectId,
                collaborator.UserId,
                targetUser.Name,
                Email = request.Email,
                collaborator.AddedAt
            });
    }

    // ─── DELETE /api/projects/{projectId}/collaborators/{userId} ──────────────
    [HttpDelete("{userId}")]
    [Authorize]
    public async Task<IActionResult> RemoveCollaborator(int projectId, int userId)
    {
        var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
        if (!projectExists)
            return NotFound(new { message = $"Project {projectId} not found." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsProjectOwnerAsync(projectId, currentUser.UserId))
            return Forbid();

        var collaborator = await _context.ProjectCollaborators
            .FirstOrDefaultAsync(pc => pc.ProjectId == projectId && pc.UserId == userId);

        if (collaborator == null)
            return NotFound(new { message = $"User {userId} is not a collaborator on project {projectId}." });

        _context.ProjectCollaborators.Remove(collaborator);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
public record AddCollaboratorRequest(string Email);