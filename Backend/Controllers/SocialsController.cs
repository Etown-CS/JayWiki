using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/users/{userId}/socials")]
public class SocialsController : ProjectBaseController
{
    public SocialsController(ApplicationDbContext context) : base(context) { }

    // ─── Authorization helper ─────────────────────────────────────────────────

    /// <summary>
    /// Returns true if the current user owns the profile (userId match) or is instructor/admin.
    /// </summary>
    private async Task<(bool allowed, Models.User? currentUser)> CanModifyAsync(int userId)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return (false, null);

        var isSelf  = currentUser.UserId == userId;
        var isAdmin = await IsInstructorOrAdminAsync(currentUser.UserId);

        return (isSelf || isAdmin, currentUser);
    }

    // ─── GET /api/users/{userId}/socials ──────────────────────────────────────
    /// <summary>
    /// List all social links for a user. Public.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetSocials(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var socials = await _context.Socials
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Platform)
            .Select(s => new
            {
                s.SocialId,
                s.UserId,
                s.Platform,
                s.Url,
                s.Username,
                s.Verified
            })
            .ToListAsync();

        return Ok(socials);
    }

    // ─── GET /api/users/{userId}/socials/{id} ─────────────────────────────────
    /// <summary>
    /// Get a single social link. Public.
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSocial(int userId, int id)
    {
        var social = await _context.Socials
            .FirstOrDefaultAsync(s => s.SocialId == id && s.UserId == userId);

        if (social == null)
            return NotFound(new { message = $"Social {id} not found for user {userId}." });

        return Ok(new
        {
            social.SocialId,
            social.UserId,
            social.Platform,
            social.Url,
            social.Username,
            social.Verified
        });
    }

    // ─── POST /api/users/{userId}/socials ─────────────────────────────────────
    /// <summary>
    /// Add a social link to a user's profile. Owner or instructor/admin only.
    /// Platform is stored lowercase (e.g., "github", "linkedin", "website").
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateSocial(int userId, [FromBody] CreateSocialRequest request)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var (allowed, _) = await CanModifyAsync(userId);
        if (!allowed) return Forbid();

        if (string.IsNullOrWhiteSpace(request.Platform))
            return BadRequest(new { message = "Platform is required." });

        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "Url is required." });

        var social = new Social
        {
            UserId   = userId,
            Platform = request.Platform.Trim().ToLower(),
            Url      = request.Url.Trim(),
            Username = request.Username?.Trim(),
            Verified = false   // Verification is a manual/admin action
        };

        _context.Socials.Add(social);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSocial), new { userId, id = social.SocialId }, new
        {
            social.SocialId,
            social.UserId,
            social.Platform,
            social.Url,
            social.Username,
            social.Verified
        });
    }

    // ─── PUT /api/users/{userId}/socials/{id} ─────────────────────────────────
    /// <summary>
    /// Update a social link. Owner or instructor/admin only.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateSocial(int userId, int id, [FromBody] UpdateSocialRequest request)
    {
        var social = await _context.Socials
            .FirstOrDefaultAsync(s => s.SocialId == id && s.UserId == userId);

        if (social == null)
            return NotFound(new { message = $"Social {id} not found for user {userId}." });

        var (allowed, _) = await CanModifyAsync(userId);
        if (!allowed) return Forbid();

        if (!string.IsNullOrWhiteSpace(request.Platform))
            social.Platform = request.Platform.Trim().ToLower();

        if (!string.IsNullOrWhiteSpace(request.Url))
            social.Url = request.Url.Trim();

        if (request.Username != null)
            social.Username = request.Username.Trim();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            social.SocialId,
            social.UserId,
            social.Platform,
            social.Url,
            social.Username,
            social.Verified
        });
    }

    // ─── DELETE /api/users/{userId}/socials/{id} ──────────────────────────────
    /// <summary>
    /// Delete a social link. Owner or instructor/admin only.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteSocial(int userId, int id)
    {
        var social = await _context.Socials
            .FirstOrDefaultAsync(s => s.SocialId == id && s.UserId == userId);

        if (social == null)
            return NotFound(new { message = $"Social {id} not found for user {userId}." });

        var (allowed, _) = await CanModifyAsync(userId);
        if (!allowed) return Forbid();

        _context.Socials.Remove(social);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateSocialRequest(
    string  Platform,
    string  Url,
    string? Username);

public record UpdateSocialRequest(
    string? Platform,
    string? Url,
    string? Username);
