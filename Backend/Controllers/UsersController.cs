using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IBlobStorageService _blobStorage;

    public UsersController(ApplicationDbContext db, IBlobStorageService blobStorage)
    {
        _db = db;
        _blobStorage = blobStorage;
    }

    // Resolves email across Google and Microsoft token claim variations.
    // Microsoft Entra ID tokens often omit the "email" claim even when
    // email scope is requested — preferred_username or upn is used instead.
    private string? ResolveEmail() =>
        User.FindFirst("email")?.Value
        ?? User.FindFirst(ClaimTypes.Email)?.Value
        ?? User.FindFirst("preferred_username")?.Value
        ?? User.FindFirst("upn")?.Value
        ?? User.FindFirst(ClaimTypes.Upn)?.Value;

    private string ResolveName() =>
        User.FindFirst("name")?.Value
        ?? User.FindFirst(ClaimTypes.Name)?.Value
        ?? User.FindFirst("given_name")?.Value
        ?? "Unknown";

    private string ResolveProvider() =>
        (User.FindFirst("iss")?.Value ?? "").Contains("accounts.google.com",
            StringComparison.OrdinalIgnoreCase)
            ? "google"
            : "microsoft";

    // POST api/users/me — upsert on first login
    [HttpPost("me")]
    public async Task<ActionResult<User>> UpsertMe()
    {
        var email    = ResolveEmail();
        var name     = ResolveName();
        var provider = ResolveProvider();

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(
                "Token is missing an email claim. " +
                "Checked: email, preferred_username, upn.");

        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing is not null)
        {
            existing.Name      = name;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        var newUser = new User
        {
            Email        = email,
            Name         = name,
            AuthProvider = provider,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        _db.Users.Add(newUser);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx
                  && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            // 2601 = unique index violation, 2627 = unique constraint violation
            // Race condition — another request inserted the same email
            // between our existence check and this insert.
            var concurrentUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (concurrentUser is not null)
            {
                return Ok(concurrentUser);
            }
            throw;
        }

        return CreatedAtAction(nameof(GetMe), newUser);
    }

    // GET api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<User>> GetMe()
    {
        var email = ResolveEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        return user is null ? NotFound() : Ok(user);
    }

    // PUT api/users/me — update profile fields
    [HttpPut("me")]
    public async Task<ActionResult<User>> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var email = ResolveEmail();
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return NotFound();

        user.ProfileImageUrl = request.ProfileImageUrl;
        user.UpdatedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(user);
    }

    // POST api/users/me/profile-image — upload profile picture to Azure Blob Storage
    [HttpPost("me/profile-image")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB limit
    public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        // Parse only the type/subtype portion before any parameters (e.g. "image/jpeg; charset=...")
        // and compare with OrdinalIgnoreCase to avoid culture-sensitive ToLower()
        var contentType = file.ContentType?.Split(';')[0].Trim() ?? "";
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only JPEG, PNG, GIF, and WEBP images are allowed." });

        var email = ResolveEmail();
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return NotFound(new { error = "User not found." });

        var previousImageUrl = user.ProfileImageUrl;

        // Upload new blob first, then update DB, then delete old blob last (best-effort).
        // This ensures if upload or DB save fails, the user's existing image is not lost.
        var newImageUrl = await _blobStorage.UploadProfileImageAsync(file, user.UserId);

        user.ProfileImageUrl = newImageUrl;
        user.UpdatedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Delete old blob only after new URL is safely persisted.
        // Best-effort: a failed cleanup does not error the request.
        if (!string.IsNullOrEmpty(previousImageUrl))
        {
            try
            {
                await _blobStorage.DeleteBlobAsync(previousImageUrl);
            }
            catch (Exception ex)
            {
                // Old blob cleanup failed — not critical, new image is already saved
                Console.WriteLine($"Warning: failed to delete old profile image blob: {ex.Message}");
            }
        }

        return Ok(new { profileImageUrl = newImageUrl });
    }

    // GET api/users — public
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var users = await _db.Users
            .Select(u => new { u.Name })
            .ToListAsync();
        return Ok(users);
    }
}

public record UpdateProfileRequest(string? ProfileImageUrl);