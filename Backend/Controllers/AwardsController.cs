using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/awards")]
public class AwardsController : ProjectBaseController
{
    public AwardsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/events/{eventId}/awards ─────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAwards(int eventId)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var awards = await _context.Awards
            .Where(a => a.EventId == eventId)
            .OrderByDescending(a => a.AwardedAt)
            .Select(a => new
            {
                a.AwardId,
                a.EventId,
                a.Title,
                a.Description,
                a.AwardedAt
            })
            .ToListAsync();

        return Ok(awards);
    }

    // ─── GET /api/events/{eventId}/awards/{id} ────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAward(int eventId, int id)
    {
        var award = await _context.Awards
            .FirstOrDefaultAsync(a => a.AwardId == id && a.EventId == eventId);

        if (award == null)
            return NotFound(new { message = $"Award {id} not found for event {eventId}." });

        return Ok(new
        {
            award.AwardId,
            award.EventId,
            award.Title,
            award.Description,
            award.AwardedAt
        });
    }

    // ─── POST /api/events/{eventId}/awards ────────────────────────────────────
    /// <summary>
    /// Create an award for an event. Instructor or admin only.
    /// AwardedAt defaults to current UTC time if not provided.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateAward(int eventId, [FromBody] CreateAwardRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        var award = new Award
        {
            EventId     = eventId,
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            AwardedAt   = request.AwardedAt ?? DateTime.UtcNow
        };

        _context.Awards.Add(award);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAward), new { eventId, id = award.AwardId }, new
        {
            award.AwardId,
            award.EventId,
            award.Title,
            award.Description,
            award.AwardedAt
        });
    }

    // ─── PUT /api/events/{eventId}/awards/{id} ────────────────────────────────
    /// <summary>
    /// Update an award. Instructor or admin only.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateAward(int eventId, int id, [FromBody] UpdateAwardRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var award = await _context.Awards
            .FirstOrDefaultAsync(a => a.AwardId == id && a.EventId == eventId);

        if (award == null)
            return NotFound(new { message = $"Award {id} not found for event {eventId}." });

        if (!string.IsNullOrWhiteSpace(request.Title))
            award.Title = request.Title.Trim();

        if (request.Description != null)
            award.Description = request.Description.Trim();

        if (request.AwardedAt.HasValue)
            award.AwardedAt = request.AwardedAt.Value;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            award.AwardId,
            award.EventId,
            award.Title,
            award.Description,
            award.AwardedAt
        });
    }

    // ─── DELETE /api/events/{eventId}/awards/{id} ─────────────────────────────
    /// <summary>
    /// Delete an award. Instructor or admin only.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteAward(int eventId, int id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var award = await _context.Awards
            .FirstOrDefaultAsync(a => a.AwardId == id && a.EventId == eventId);

        if (award == null)
            return NotFound(new { message = $"Award {id} not found for event {eventId}." });

        _context.Awards.Remove(award);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // ─── GET /api/users/{userId}/awards ──────────────────────────────────────────
    [HttpGet("/api/users/{userId}/awards")]
    [AllowAnonymous]
    public async Task<IActionResult> GetUserAwards(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var awards = await _context.Awards
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.AwardedAt)
            .Select(a => new
            {
                a.AwardId,
                a.EventId,
                a.UserId,
                a.Title,
                a.Description,
                a.AwardedAt
            })
            .ToListAsync();

        return Ok(awards);
    }

    // ─── GET /api/awards/{id} ─────────────────────────────────────────────────────
    [HttpGet("/api/awards/{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAwardDetail(int id)
    {
        var award = await _context.Awards
            .Include(a => a.Event)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.AwardId == id);

        if (award == null)
            return NotFound(new { message = $"Award {id} not found." });

        return Ok(new
        {
            award.AwardId,
            award.Title,
            award.Description,
            award.AwardedAt,
            Event = award.Event == null ? null : new
            {
                award.Event.EventId,
                award.Event.Title,
                award.Event.Category,
                award.Event.EventDate
            },
            Recipient = award.User == null ? null : new
            {
                award.User.UserId,
                award.User.Name,
                award.User.ProfileImageUrl
            }
        });
    }

    // ─── POST /api/users/{userId}/awards ─────────────────────────────────────────
    [HttpPost("/api/users/{userId}/awards")]
    [Authorize]
    public async Task<IActionResult> CreateUserAward(int userId, [FromBody] CreateUserAwardRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        if (request.EventId.HasValue)
        {
            var eventExists = await _context.Events.AnyAsync(e => e.EventId == request.EventId);
            if (!eventExists)
                return NotFound(new { message = $"Event {request.EventId} not found." });
        }

        var award = new Award
        {
            UserId      = userId,
            EventId     = request.EventId,
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            AwardedAt   = request.AwardedAt ?? DateTime.UtcNow
        };

        _context.Awards.Add(award);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAwardDetail), new { id = award.AwardId }, new
        {
            award.AwardId,
            award.EventId,
            award.UserId,
            award.Title,
            award.Description,
            award.AwardedAt
        });
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateAwardRequest(
    string    Title,
    string?   Description,
    DateTime? AwardedAt);

public record UpdateAwardRequest(
    string?   Title,
    string?   Description,
    DateTime? AwardedAt);

public record CreateUserAwardRequest(
    string    Title,
    string?   Description,
    int?      EventId,
    DateTime? AwardedAt);