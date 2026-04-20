using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/users/{userId}/projects")]
public class ProjectsController : ProjectBaseController
{
    public ProjectsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/projects ────────────────────────────────────────────────────
    /// Returns all projects across all users with owner name and topics embedded.
    /// Used by the Explore page to avoid N+1 per-user fetches.
    /// Supports optional ?status= and ?type= filters.
    [HttpGet("/api/projects")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllProjects(
        [FromQuery] string? status = null,
        [FromQuery] string? type   = null)
    {
        var query = _context.Projects
            .Include(p => p.User)
            .Include(p => p.Topics)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status.Trim().ToLower());

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(p => p.ProjectType == type.Trim().ToLower());

        var projects = await query
            .OrderByDescending(p => p.ProjectId)
            .Select(p => new
            {
                p.ProjectId,
                p.UserId,
                OwnerName = p.User.Name,
                p.Title,
                p.Description,
                p.ProjectType,
                p.Status,
                p.StartDate,
                p.EndDate,
                p.GithubUrl,
                p.DemoUrl,
                Topics = p.Topics.Select(t => new { t.TopicId, t.Name })
            })
            .ToListAsync();

        return Ok(projects);
    }

    // ─── GET /api/users/{userId}/projects ─────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetProjects(int userId, [FromQuery] string? status, [FromQuery] string? type)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var query = _context.Projects
            .Where(p => p.UserId == userId)
            .Include(p => p.Course).ThenInclude(c => c!.Catalog)
            .Include(p => p.Topics)
            .Include(p => p.Collaborators).ThenInclude(c => c.User).ThenInclude(u => u.Identities)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(p => p.ProjectType == type);

        var projects = await query
            .OrderByDescending(p => p.StartDate)
            .Select(p => new
            {
                p.ProjectId,
                p.UserId,
                p.ProjectType,
                p.Title,
                p.Description,
                p.StartDate,
                p.EndDate,
                p.Status,
                p.GithubUrl,
                p.DemoUrl,
                Course = p.Course == null ? null : new
                {
                    p.Course.CourseId,
                    p.Course.Catalog.CourseCode,
                    p.Course.Catalog.CourseName,
                    p.Course.Semester,
                    p.Course.Year
                },
                Topics = p.Topics.Select(t => new { t.TopicId, t.Name }),
                Collaborators = p.Collaborators.Select(c => new
                {
                    c.ProjectCollaboratorId,
                    c.UserId,
                    c.User.Name,
                    Email = c.User.Identities
                        .Where(i => i.IsPrimary)
                        .Select(i => i.ProviderEmail)
                        .FirstOrDefault()
                })
            })
            .ToListAsync();

        return Ok(projects);
    }

    // ─── GET /api/users/{userId}/projects/{id} ────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProject(int userId, int id)
    {
        var project = await _context.Projects
            .Where(p => p.ProjectId == id && p.UserId == userId)
            .Include(p => p.Course).ThenInclude(c => c!.Catalog)
            .Include(p => p.Topics)
            .Include(p => p.ProjectMedia)
            .Include(p => p.Collaborators).ThenInclude(c => c.User).ThenInclude(u => u.Identities)
            .FirstOrDefaultAsync();

        if (project == null)
            return NotFound(new { message = $"Project {id} not found for user {userId}." });

        return Ok(new
        {
            project.ProjectId,
            project.UserId,
            project.ProjectType,
            project.Title,
            project.Description,
            project.StartDate,
            project.EndDate,
            project.Status,
            project.GithubUrl,
            project.DemoUrl,
            Course = project.Course == null ? null : new
            {
                project.Course.CourseId,
                project.Course.Catalog.CourseCode,
                project.Course.Catalog.CourseName,
                project.Course.Semester,
                project.Course.Year
            },
            Topics = project.Topics.Select(t => new { t.TopicId, t.Name }),
            Media = project.ProjectMedia.Select(m => new
            {
                m.ProjectMediaId,
                m.MediaType,
                m.Url
            }),
            Collaborators = project.Collaborators.Select(c => new
            {
                c.ProjectCollaboratorId,
                c.UserId,
                c.User.Name,
                Email = c.User.Identities
                    .Where(i => i.IsPrimary)
                    .Select(i => i.ProviderEmail)
                    .FirstOrDefault()
            })
        });
    }

    // ─── GET /api/users/{userId}/courses/{courseId}/projects ──────────────────
    [HttpGet("/api/users/{userId}/courses/{courseId}/projects")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProjectsByCourse(int userId, int courseId)
    {
        var courseExists = await _context.Courses
            .AnyAsync(c => c.CourseId == courseId && c.UserId == userId);
        if (!courseExists)
            return NotFound(new { message = $"Course {courseId} not found for user {userId}." });

        var projects = await _context.Projects
            .Where(p => p.UserId == userId && p.CourseId == courseId)
            .Include(p => p.Topics)
            .Select(p => new
            {
                p.ProjectId,
                p.ProjectType,
                p.Title,
                p.Description,
                p.StartDate,
                p.EndDate,
                p.Status,
                p.GithubUrl,
                p.DemoUrl,
                Topics = p.Topics.Select(t => new { t.TopicId, t.Name })
            })
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        return Ok(projects);
    }

    // ─── GET /api/projects/trending-topics ───────────────────────────────────────
    /// <summary>
    /// Returns the top N most-used topic names across all projects, ordered by frequency.
    /// Used by the Explore page to populate the trending technologies section.
    /// </summary>
    [HttpGet("/api/projects/trending-topics")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTrendingTopics([FromQuery] int limit = 20)
    {
        var topics = await _context.Topics
            .GroupBy(t => t.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(limit)
            .Select(g => g.Name)
            .ToListAsync();

        return Ok(topics);
    }

    // ─── POST /api/users/{userId}/projects ────────────────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateProject(int userId, [FromBody] CreateProjectRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (currentUser.UserId != userId)
            return Forbid();

        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        var validTypes    = new[] { "academic", "research", "club", "personal" };
        var validStatuses = new[] { "active", "completed", "archived" };

        if (!string.IsNullOrWhiteSpace(request.ProjectType) && !validTypes.Contains(request.ProjectType))
            return BadRequest(new { message = $"Invalid project type. Must be one of: {string.Join(", ", validTypes)}." });

        if (!string.IsNullOrWhiteSpace(request.Status) && !validStatuses.Contains(request.Status))
            return BadRequest(new { message = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}." });

        if (request.CourseId.HasValue)
        {
            var courseExists = await _context.Courses
                .AnyAsync(c => c.CourseId == request.CourseId && c.UserId == userId);
            if (!courseExists)
                return NotFound(new { message = $"Course {request.CourseId} not found for user {userId}." });
        }

        var project = new Project
        {
            UserId      = userId,
            CourseId    = request.CourseId,
            ProjectType = request.ProjectType ?? "academic",
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            StartDate   = request.StartDate,
            EndDate     = request.EndDate,
            Status      = request.Status ?? "active",
            GithubUrl   = request.GithubUrl?.Trim(),
            DemoUrl     = request.DemoUrl?.Trim(),
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProject),
            new { userId, id = project.ProjectId },
            new
            {
                project.ProjectId,
                project.UserId,
                project.CourseId,
                project.ProjectType,
                project.Title,
                project.Description,
                project.StartDate,
                project.EndDate,
                project.Status,
                project.GithubUrl,
                project.DemoUrl
            });
    }

    // ─── PUT /api/users/{userId}/projects/{id} ────────────────────────────────
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateProject(int userId, int id, [FromBody] UpdateProjectRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == id && p.UserId == userId);

        if (project == null)
            return NotFound(new { message = $"Project {id} not found for user {userId}." });

        if (!await IsProjectMemberAsync(id, currentUser.UserId))
            return Forbid();

        var validTypes    = new[] { "academic", "research", "club", "personal" };
        var validStatuses = new[] { "active", "completed", "archived" };

        if (!string.IsNullOrWhiteSpace(request.ProjectType) && !validTypes.Contains(request.ProjectType))
            return BadRequest(new { message = $"Invalid project type. Must be one of: {string.Join(", ", validTypes)}." });

        if (!string.IsNullOrWhiteSpace(request.Status) && !validStatuses.Contains(request.Status))
            return BadRequest(new { message = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}." });

        if (request.CourseId.HasValue && request.CourseId != project.CourseId)
        {
            var courseExists = await _context.Courses
                .AnyAsync(c => c.CourseId == request.CourseId && c.UserId == userId);
            if (!courseExists)
                return NotFound(new { message = $"Course {request.CourseId} not found for user {userId}." });
        }

        project.CourseId    = request.CourseId    ?? project.CourseId;
        project.ProjectType = request.ProjectType ?? project.ProjectType;
        project.Title       = request.Title?.Trim() ?? project.Title;
        project.Description = request.Description?.Trim() ?? project.Description;
        project.StartDate   = request.StartDate   ?? project.StartDate;
        project.EndDate     = request.EndDate     ?? project.EndDate;
        project.Status      = request.Status      ?? project.Status;
        project.GithubUrl   = request.GithubUrl?.Trim() ?? project.GithubUrl;
        project.DemoUrl     = request.DemoUrl?.Trim()   ?? project.DemoUrl;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            project.ProjectId,
            project.UserId,
            project.CourseId,
            project.ProjectType,
            project.Title,
            project.Description,
            project.StartDate,
            project.EndDate,
            project.Status,
            project.GithubUrl,
            project.DemoUrl
        });
    }

    // ─── DELETE /api/users/{userId}/projects/{id} ─────────────────────────────
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteProject(int userId, int id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == id && p.UserId == userId);

        if (project == null)
            return NotFound(new { message = $"Project {id} not found for user {userId}." });

        if (currentUser.UserId != userId)
            return Forbid();

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateProjectRequest(
    string    Title,
    string?   Description,
    string?   ProjectType,
    int?      CourseId,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string?   Status,
    string?   GithubUrl,
    string?   DemoUrl);

public record UpdateProjectRequest(
    string?   Title,
    string?   Description,
    string?   ProjectType,
    int?      CourseId,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string?   Status,
    string?   GithubUrl,
    string?   DemoUrl);