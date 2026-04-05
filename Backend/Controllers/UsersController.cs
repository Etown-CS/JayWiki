using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/users")]
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
        (User.FindFirst("iss")?.Value ?? "") switch
        {
            var iss when iss.Contains("accounts.google.com", StringComparison.OrdinalIgnoreCase) => "google",
            var iss when iss.Contains("login.microsoftonline.com", StringComparison.OrdinalIgnoreCase) => "microsoft",
            var iss when iss == "jaywiki-api" => "local",
            _ => "unknown"
        };

    private async Task<User?> GetCurrentUserAsync()
    {
        var email = ResolveEmail();
        if (string.IsNullOrWhiteSpace(email)) return null;

        var identity = await _db.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.ProviderEmail == email);

        return identity?.User;
    }

    // POST api/users/me — upsert on first OAuth login
    [HttpPost("me")]
    public async Task<ActionResult<object>> UpsertMe()
    {
        var email    = ResolveEmail();
        var name     = ResolveName();
        var provider = ResolveProvider();

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("Token is missing an email claim.");

        // Check if this specific provider+email identity already exists
        var existingIdentity = await _db.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Provider == provider && i.ProviderEmail == email);

        if (existingIdentity is not null)
        {
            // Update name in case it changed
            existingIdentity.User.Name      = name;
            existingIdentity.User.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(BuildUserResponse(existingIdentity.User, email));
        }

        // Check if a user exists with this email on a different provider — link instead of duplicate
        var existingOtherIdentity = await _db.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.ProviderEmail == email && i.Provider != provider);

        User user;
        if (existingOtherIdentity is not null)
        {
            // Link new provider to existing user account
            user = existingOtherIdentity.User;
        }
        else
        {
            // Brand new user
            user = new User
            {
                Name      = name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        var identity = new UserIdentity
        {
            UserId        = user.UserId,
            Provider      = provider,
            ProviderEmail = email,
            IsPrimary     = !await _db.UserIdentities.AnyAsync(i => i.UserId == user.UserId),
            LinkedAt      = DateTime.UtcNow
        };

        _db.UserIdentities.Add(identity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx
                  && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            // Race condition — identity was inserted concurrently
            var concurrent = await _db.UserIdentities
                .Include(i => i.User)
                .FirstOrDefaultAsync(i => i.Provider == provider && i.ProviderEmail == email);
            if (concurrent is not null)
                return Ok(BuildUserResponse(concurrent.User, email));
            throw;
        }

        return CreatedAtAction(nameof(GetMe), BuildUserResponse(user, email));
    }

    // GET api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<object>> GetMe()
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound();

        var email = ResolveEmail();
        return Ok(BuildUserResponse(user, email));
    }

    // PUT api/users/me — update profile fields
    [HttpPut("me")]
    public async Task<ActionResult<object>> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name))
            user.Name = request.Name.Trim();

        user.ProfileImageUrl = request.ProfileImageUrl;
        user.UpdatedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var email = ResolveEmail();
        return Ok(BuildUserResponse(user, email));
    }

    // GET api/users/me/identities — list all linked providers
    [HttpGet("me/identities")]
    public async Task<IActionResult> GetIdentities()
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound();

        var identities = await _db.UserIdentities
            .Where(i => i.UserId == user.UserId)
            .Select(i => new
            {
                i.IdentityId,
                i.Provider,
                i.ProviderEmail,
                i.IsPrimary,
                i.LinkedAt
            })
            .ToListAsync();

        return Ok(identities);
    }

    // POST api/users/me/identities/primary/{identityId} — change primary email
    [HttpPost("me/identities/primary/{identityId}")]
    public async Task<IActionResult> SetPrimaryIdentity(int identityId)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound();

        var target = await _db.UserIdentities
            .FirstOrDefaultAsync(i => i.IdentityId == identityId && i.UserId == user.UserId);

        if (target is null)
            return NotFound(new { message = "Identity not found." });

        // Clear current primary, set new one
        var allIdentities = await _db.UserIdentities
            .Where(i => i.UserId == user.UserId)
            .ToListAsync();

        foreach (var i in allIdentities) i.IsPrimary = false;
        target.IsPrimary = true;

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Primary identity updated to {target.ProviderEmail} ({target.Provider})." });
    }

    // DELETE api/users/me/identities/{identityId} — unlink a provider
    [HttpDelete("me/identities/{identityId}")]
    public async Task<IActionResult> UnlinkIdentity(int identityId)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound();

        var identities = await _db.UserIdentities
            .Where(i => i.UserId == user.UserId)
            .ToListAsync();

        if (identities.Count <= 1)
            return BadRequest(new { message = "Cannot remove your only login method." });

        var target = identities.FirstOrDefault(i => i.IdentityId == identityId);
        if (target is null)
            return NotFound(new { message = "Identity not found." });

        // If removing primary, auto-assign next available as primary
        if (target.IsPrimary)
        {
            var next = identities.First(i => i.IdentityId != identityId);
            next.IsPrimary = true;
        }

        _db.UserIdentities.Remove(target);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // POST api/users/me/profile-image
    [HttpPost("me/profile-image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProfileImage([FromForm] ProfileImageUploadRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var contentType  = request.File.ContentType?.Split(';')[0].Trim() ?? "";
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only JPEG, PNG, GIF, and WEBP images are allowed." });

        var user = await GetCurrentUserAsync();
        if (user is null) return NotFound(new { error = "User not found." });

        var previousImageUrl = user.ProfileImageUrl;
        var newImageUrl      = await _blobStorage.UploadProfileImageAsync(request.File, user.UserId);

        user.ProfileImageUrl = newImageUrl;
        user.UpdatedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(previousImageUrl))
        {
            try { await _blobStorage.DeleteBlobAsync(previousImageUrl); }
            catch (Exception ex)
            { Console.WriteLine($"Warning: failed to delete old profile image: {ex.Message}"); }
        }

        return Ok(new { profileImageUrl = newImageUrl });
    }

    // GET api/users — public
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var users = await _db.Users
            .Select(u => new { u.UserId, u.Name, u.ProfileImageUrl })
            .ToListAsync();
        return Ok(users);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object BuildUserResponse(User user, string? currentEmail) => new
    {
        user.UserId,
        user.Name,
        user.Role,
        user.ProfileImageUrl,
        user.CreatedAt,
        user.UpdatedAt,
        PrimaryEmail = user.Identities
            .FirstOrDefault(i => i.IsPrimary)?.ProviderEmail ?? currentEmail
    };
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record UpdateProfileRequest(string? Name, string? ProfileImageUrl);

public class ProfileImageUploadRequest
{
    public IFormFile File { get; set; } = null!;
}