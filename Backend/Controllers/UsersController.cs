using Backend.Data;
using Backend.Models;
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

    public UsersController(ApplicationDbContext db) => _db = db;

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