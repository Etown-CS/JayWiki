using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public UsersController(ApplicationDbContext db) => _db = db;

    // POST api/users/me — upsert on first login
    [HttpPost("me")]
    public async Task<ActionResult<User>> UpsertMe()
    {
        var email    = User.FindFirst("email")?.Value
                    ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
        var name     = User.FindFirst("name")?.Value
                    ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value
                    ?? "Unknown";
        var issuer   = User.FindFirst("iss")?.Value ?? "";
        var provider = issuer.Contains("google") ? "google" : "microsoft";

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("Token is missing an email claim.");

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
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMe), newUser);
    }

    // GET api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<User>> GetMe()
    {
        var email = User.FindFirst("email")?.Value
                 ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        return user is null ? NotFound() : Ok(user);
    }

    // GET api/users — public
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var users = await _db.Users
            .Select(u => new { u.UserId, u.Name })
            .ToListAsync();
        return Ok(users);
    }
}