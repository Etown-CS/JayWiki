using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/registrations")]
public class EventRegistrationsController : ProjectBaseController
{
    public EventRegistrationsController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/events/{eventId}/registrations ──────────────────────────────
    /// <summary>
    /// List all registrations for an event. Public.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetRegistrations(int eventId)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var registrations = await _context.EventRegistrations
            .Include(r => r.User)
            .Where(r => r.EventId == eventId)
            .OrderBy(r => r.RegisteredAt)
            .Select(r => new
            {
                r.EventRegistrationId,
                r.EventId,
                r.UserId,
                r.User.Name,
                r.User.ProfileImageUrl,
                r.RegisteredAt
            })
            .ToListAsync();

        return Ok(registrations);
    }

    // ─── POST /api/events/{eventId}/registrations ─────────────────────────────
    /// <summary>
    /// Register the currently authenticated user for an event.
    /// Returns 409 Conflict if already registered.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Register(int eventId)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized(new { message = "User not found." });

        var alreadyRegistered = await _context.EventRegistrations
            .AnyAsync(r => r.EventId == eventId && r.UserId == currentUser.UserId);

        if (alreadyRegistered)
            return Conflict(new { message = "You are already registered for this event." });

        var registration = new EventRegistration
        {
            EventId      = eventId,
            UserId       = currentUser.UserId,
            RegisteredAt = DateTime.UtcNow
        };

        _context.EventRegistrations.Add(registration);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRegistrations), new { eventId }, new
        {
            registration.EventRegistrationId,
            registration.EventId,
            registration.UserId,
            currentUser.Name,
            currentUser.ProfileImageUrl,
            registration.RegisteredAt
        });
    }

    // ─── DELETE /api/events/{eventId}/registrations/{userId} ─────────────────
    /// <summary>
    /// Unregister a user from an event.
    /// Users may unregister themselves. Instructors/admins may unregister anyone.
    /// </summary>
    [HttpDelete("{userId}")]
    [Authorize]
    public async Task<IActionResult> Unregister(int eventId, int userId)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null)
            return Unauthorized(new { message = "User not found." });

        // Users can only unregister themselves unless they are instructor/admin
        var isSelf  = currentUser.UserId == userId;
        var isAdmin = await IsInstructorOrAdminAsync(currentUser.UserId);

        if (!isSelf && !isAdmin)
            return Forbid();

        var registration = await _context.EventRegistrations
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);

        if (registration == null)
            return NotFound(new { message = $"User {userId} is not registered for event {eventId}." });

        _context.EventRegistrations.Remove(registration);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
