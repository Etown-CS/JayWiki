using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ProjectBaseController
{
    public EventsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/events ──────────────────────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetEvents(
        [FromQuery] string? category = null,
        [FromQuery] string? search   = null)
    {
        var query = _context.Events.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(e => e.Category == category.Trim().ToLower());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(e =>
                e.Title.Contains(term) ||
                (e.Description != null && e.Description.Contains(term)));
        }

        var events = await query
            .OrderByDescending(e => e.EventDate)
            .Select(e => new
            {
                e.EventId,
                e.Title,
                e.Description,
                e.Category,
                e.EventDate
            })
            .ToListAsync();

        return Ok(events);
    }

    // ─── GET /api/events/{id} ─────────────────────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEvent(int id)
    {
        var ev = await _context.Events.FindAsync(id);
        if (ev == null)
            return NotFound(new { message = $"Event {id} not found." });

        var registrations = await _context.EventRegistrations
            .Where(r => r.EventId == id)
            .Join(_context.Users,
                  r => r.UserId,
                  u => u.UserId,
                  (r, u) => new
                  {
                      r.EventRegistrationId,
                      r.UserId,
                      u.Name,
                      u.ProfileImageUrl,
                      r.RegisteredAt
                  })
            .ToListAsync();

        var media = await _context.EventMedia
            .Where(m => m.EventId == id)
            .Select(m => new { m.EventMediaId, m.MediaType, m.Url })
            .ToListAsync();

        var awards = await _context.Awards
            .Where(a => a.EventId == id)
            .Select(a => new { a.AwardId, a.Title, a.Description, a.AwardedAt })
            .ToListAsync();

        return Ok(new
        {
            ev.EventId,
            ev.Title,
            ev.Description,
            ev.Category,
            ev.EventDate,
            Registrations = registrations,
            Media         = media,
            Awards        = awards
        });
    }

    // ─── GET /api/users/{userId}/events ──────────────────────────────────────────
    /// Returns all events the user is registered for, ordered by event date descending.
    [HttpGet("/api/users/{userId}/events")]
    [AllowAnonymous]
    public async Task<IActionResult> GetUserEvents(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var events = await _context.EventRegistrations
            .Where(r => r.UserId == userId)
            .Include(r => r.Event)
            .OrderByDescending(r => r.Event.EventDate)
            .Select(r => new
            {
                r.Event.EventId,
                r.Event.Title,
                r.Event.Description,
                r.Event.Category,
                r.Event.EventDate,
                r.RegisteredAt
            })
            .ToListAsync();

        return Ok(events);
    }

    // ─── POST /api/events ─────────────────────────────────────────────────────
    /// <summary>
    /// Create a new event. Requires instructor or admin privileges.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        var validCategories = new[] { "club", "sport", "academic", "other" };
        var category        = request.Category?.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(category) || !validCategories.Contains(category))
            return BadRequest(new { message = $"Category must be one of: {string.Join(", ", validCategories)}." });

        var ev = new Event
        {
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category    = category,
            EventDate   = request.EventDate
        };

        _context.Events.Add(ev);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEvent), new { id = ev.EventId }, new
        {
            ev.EventId,
            ev.Title,
            ev.Description,
            ev.Category,
            ev.EventDate
        });
    }

    // ─── PUT /api/events/{id} ─────────────────────────────────────────────────
    /// <summary>
    /// Update an existing event. Requires instructor or admin privileges.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateEvent(int id, [FromBody] UpdateEventRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null)
            return NotFound(new { message = $"Event {id} not found." });

        var validCategories = new[] { "club", "sport", "academic", "other" };

        if (!string.IsNullOrWhiteSpace(request.Title))
            ev.Title = request.Title.Trim();

        if (request.Description != null)
            ev.Description = request.Description.Trim();

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var category = request.Category.Trim().ToLower();
            if (!validCategories.Contains(category))
                return BadRequest(new { message = $"Category must be one of: {string.Join(", ", validCategories)}." });
            ev.Category = category;
        }

        if (request.EventDate.HasValue)
            ev.EventDate = request.EventDate.Value;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            ev.EventId,
            ev.Title,
            ev.Description,
            ev.Category,
            ev.EventDate
        });
    }

    // ─── DELETE /api/events/{id} ──────────────────────────────────────────────
    /// <summary>
    /// Delete an event. Requires instructor or admin privileges.
    /// EF cascade handles EVENT_REGISTRATION, EVENT_MEDIA, and AWARD.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (!await IsInstructorOrAdminAsync(currentUser.UserId))
            return Forbid();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null)
            return NotFound(new { message = $"Event {id} not found." });

        _context.Events.Remove(ev);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateEventRequest(
    string   Title,
    string?  Description,
    string   Category,
    DateTime EventDate);

public record UpdateEventRequest(
    string?   Title,
    string?   Description,
    string?   Category,
    DateTime? EventDate);