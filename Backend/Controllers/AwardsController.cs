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
    /// <summary>
    /// List all awards for an event. Public.
    /// </summary>
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
    /// <summary>
    /// Get a single award by ID within an event. Public.
    /// </summary>
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
    /// Create an award for an event. Requires authentication.
    /// AwardedAt defaults to current UTC time if not provided.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateAward(int eventId, [FromBody] CreateAwardRequest request)
    {
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
    /// Update an award. Requires authentication.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateAward(int eventId, int id, [FromBody] UpdateAwardRequest request)
    {
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
    /// Delete an award. Requires authentication.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteAward(int eventId, int id)
    {
        var award = await _context.Awards
            .FirstOrDefaultAsync(a => a.AwardId == id && a.EventId == eventId);

        if (award == null)
            return NotFound(new { message = $"Award {id} not found for event {eventId}." });

        _context.Awards.Remove(award);
        await _context.SaveChangesAsync();

        return NoContent();
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
