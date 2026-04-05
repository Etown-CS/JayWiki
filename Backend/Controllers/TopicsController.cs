using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/projects/{projectId}/topics")]
public class TopicsController : ProjectBaseController
{
    public TopicsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/projects/{projectId}/topics ─────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetTopics(int projectId)
    {
        var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
        if (!projectExists) return NotFound(new { message = $"Project {projectId} not found." });

        var topics = await _context.Topics
            .Where(t => t.ProjectId == projectId)
            .Select(t => new { t.TopicId, t.ProjectId, t.Name })
            .ToListAsync();

        return Ok(topics);
    }

    // ─── GET /api/projects/{projectId}/topics/{id} ────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTopic(int projectId, int id)
    {
        var topic = await _context.Topics
            .FirstOrDefaultAsync(t => t.TopicId == id && t.ProjectId == projectId);

        if (topic == null)
            return NotFound(new { message = $"Topic {id} not found on project {projectId}." });

        return Ok(new { topic.TopicId, topic.ProjectId, topic.Name });
    }

    // ─── POST /api/projects/{projectId}/topics ────────────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateTopic(int projectId, [FromBody] CreateTopicRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Topic name is required." });

        var projectExists = await _context.Projects.AnyAsync(p => p.ProjectId == projectId);
        if (!projectExists)
            return NotFound(new { message = $"Project {projectId} not found." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsProjectMemberAsync(projectId, currentUser.UserId))
            return Forbid();

        // Prevent duplicate topic names on the same project
        var duplicate = await _context.Topics
            .AnyAsync(t => t.ProjectId == projectId && t.Name == request.Name.Trim());
        if (duplicate)
            return Conflict(new { message = $"Topic '{request.Name}' already exists on this project." });

        var topic = new Topic
        {
            ProjectId = projectId,
            Name = request.Name.Trim()
        };

        _context.Topics.Add(topic);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTopic),
            new { projectId, id = topic.TopicId },
            new { topic.TopicId, topic.ProjectId, topic.Name });
    }

    // ─── PUT /api/projects/{projectId}/topics/{id} ────────────────────────────
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateTopic(int projectId, int id, [FromBody] UpdateTopicRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Topic name is required." });

        var topic = await _context.Topics
            .FirstOrDefaultAsync(t => t.TopicId == id && t.ProjectId == projectId);

        if (topic == null)
            return NotFound(new { message = $"Topic {id} not found on project {projectId}." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsProjectMemberAsync(projectId, currentUser.UserId))
            return Forbid();

        // Prevent duplicate topic names on the same project (excluding itself)
        var duplicate = await _context.Topics
            .AnyAsync(t => t.ProjectId == projectId && t.Name == request.Name.Trim() && t.TopicId != id);
        if (duplicate)
            return Conflict(new { message = $"Topic '{request.Name}' already exists on this project." });

        topic.Name = request.Name.Trim();
        await _context.SaveChangesAsync();

        return Ok(new { topic.TopicId, topic.ProjectId, topic.Name });
    }

    // ─── DELETE /api/projects/{projectId}/topics/{id} ─────────────────────────
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteTopic(int projectId, int id)
    {
        var topic = await _context.Topics
            .FirstOrDefaultAsync(t => t.TopicId == id && t.ProjectId == projectId);

        if (topic == null)
            return NotFound(new { message = $"Topic {id} not found on project {projectId}." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsProjectMemberAsync(projectId, currentUser.UserId))
            return Forbid();

        _context.Topics.Remove(topic);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateTopicRequest(string Name);
public record UpdateTopicRequest(string Name);