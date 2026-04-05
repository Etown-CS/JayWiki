using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly JwtSigningConfig _jwtConfig;

    // Precomputed dummy hash — used in Login() to prevent timing attacks
    // without re-hashing on every failed attempt (BCrypt is intentionally slow)
    private static readonly string _dummyHash = BCrypt.Net.BCrypt.HashPassword("dummy-password-that-never-matches");

    public AuthController(ApplicationDbContext db, JwtSigningConfig jwtConfig)
    {
        _db        = db;
        _jwtConfig = jwtConfig;
    }

    // POST api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (request.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        var existing = await _db.UserIdentities
            .AnyAsync(i => i.Provider == "local" && i.ProviderEmail == request.Email.Trim().ToLower());

        if (existing)
            return Conflict(new { message = "An account with that email already exists." });

        var user = new User
        {
            Name      = request.Name?.Trim() ?? request.Email.Split('@')[0],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var identity = new UserIdentity
        {
            UserId        = user.UserId,
            Provider      = "local",
            ProviderEmail = request.Email.Trim().ToLower(),
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsPrimary     = true,
            LinkedAt      = DateTime.UtcNow
        };

        _db.UserIdentities.Add(identity);
        await _db.SaveChangesAsync();

        var token = GenerateToken(user, identity.ProviderEmail);
        return Ok(new { token, user.UserId, user.Name, user.Role });
    }

    // POST api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var identity = await _db.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i =>
                i.Provider == "local" &&
                i.ProviderEmail == request.Email.Trim().ToLower());

        // Use constant-time comparison path even on not-found to prevent timing attacks
        var hashToCheck = identity?.PasswordHash ?? _dummyHash;
        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, hashToCheck);

        if (identity is null || !passwordValid)
            return Unauthorized(new { message = "Invalid email or password." });

        var token = GenerateToken(identity.User, identity.ProviderEmail);
        return Ok(new { token, identity.User.UserId, identity.User.Name, identity.User.Role });
    }

    // POST api/auth/link — link a new local email/password to existing OAuth account
    [HttpPost("link")]
    [Authorize]
    public async Task<IActionResult> LinkLocalAccount([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (request.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        // Find current user via their OAuth token
        var currentEmail = User.FindFirst("email")?.Value
                        ?? User.FindFirst(ClaimTypes.Email)?.Value
                        ?? User.FindFirst("preferred_username")?.Value
                        ?? User.FindFirst("upn")?.Value
                        ?? User.FindFirst(ClaimTypes.Upn)?.Value;

        if (string.IsNullOrWhiteSpace(currentEmail)) return Unauthorized();

        // Scope by provider to avoid ambiguous match across providers sharing same email
        var issuer = User.FindFirst("iss")?.Value ?? "";
        var provider = issuer.Contains("accounts.google.com", StringComparison.OrdinalIgnoreCase) ? "google"
                    : issuer.Contains("login.microsoftonline.com", StringComparison.OrdinalIgnoreCase) ? "microsoft"
                    : "local";

        var currentIdentity = await _db.UserIdentities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Provider == provider && i.ProviderEmail == currentEmail);

        if (currentIdentity is null) return NotFound(new { message = "Current user not found." });

        var emailTaken = await _db.UserIdentities
            .AnyAsync(i => i.Provider == "local" && i.ProviderEmail == request.Email.Trim().ToLower());

        if (emailTaken)
            return Conflict(new { message = "That email is already linked to an account." });

        var newIdentity = new UserIdentity
        {
            UserId        = currentIdentity.UserId,
            Provider      = "local",
            ProviderEmail = request.Email.Trim().ToLower(),
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsPrimary     = false,
            LinkedAt      = DateTime.UtcNow
        };

        _db.UserIdentities.Add(newIdentity);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Local login linked successfully.", email = newIdentity.ProviderEmail });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string GenerateToken(User user, string email)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtConfig.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("email", email),
            new Claim("name", user.Name),
            new Claim("role", user.Role),
            new Claim(JwtRegisteredClaimNames.Iss, _jwtConfig.Issuer),
            new Claim(JwtRegisteredClaimNames.Aud, _jwtConfig.Audience),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
        };

        var token = new JwtSecurityToken(
            issuer:             _jwtConfig.Issuer,
            audience:           _jwtConfig.Audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string? Name);
public record LoginRequest(string Email, string Password);