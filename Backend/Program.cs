using System.IdentityModel.Tokens.Jwt;
using Backend.Data;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;

// ── Load .env BEFORE building the host ───────────────────────────────────────
// Probe both cwd/.env and cwd/../.env so the app finds the repo-root .env
// regardless of whether it is started from Backend/ or the repo root.
var cwd = Directory.GetCurrentDirectory();
var envCandidates = new[]
{
    Path.Combine(cwd, ".env"),
    Path.Combine(cwd, "..", ".env"),
};
foreach (var envPath in envCandidates)
{
    if (File.Exists(envPath))
    {
        Env.Load(envPath);
        break;
    }
}

var builder = WebApplication.CreateBuilder(args);

// ── Helper: fail fast on missing or placeholder config ───────────────────────
static string GetRequiredConfig(WebApplicationBuilder b, string key)
{
    var value = b.Configuration[key];
    if (string.IsNullOrWhiteSpace(value) ||
        (value!.Length >= 2 && value[0] == '%' && value[^1] == '%'))
    {
        throw new InvalidOperationException(
            $"Required configuration '{key}' is missing or still set to a placeholder. " +
            "Ensure it is configured via .env or Azure Application Settings before starting.");
    }
    return value;
}

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = GetRequiredConfig(builder, "ConnectionStrings:DefaultConnection");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// ── Authentication — dual JWT Bearer (Google + Microsoft) ─────────────────────
var googleClientId    = GetRequiredConfig(builder, "Authentication:Google:ClientId");
var microsoftClientId = GetRequiredConfig(builder, "Authentication:Microsoft:ClientId");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme          = "MultiScheme";
        options.DefaultChallengeScheme = "MultiScheme";
    })
    .AddPolicyScheme("MultiScheme", "MultiScheme", options =>
    {
        options.ForwardDefaultSelector = context =>
        {
            var authHeader = context.Request.Headers[HeaderNames.Authorization]
                                            .ToString();
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader["Bearer ".Length..].Trim();
                var handler = new JwtSecurityTokenHandler();

                if (handler.CanReadToken(token))
                {
                    try
                    {
                        var issuer = handler.ReadJwtToken(token).Issuer;

                        if (issuer.Contains("accounts.google.com",
                                StringComparison.OrdinalIgnoreCase))
                            return "Google";

                        if (issuer.Contains("login.microsoftonline.com",
                                StringComparison.OrdinalIgnoreCase))
                            return "Microsoft";
                    }
                    catch
                    {
                        // Malformed token — fall through to safe default
                    }
                }
            }
            return "Google";
        };
    })
    .AddJwtBearer("Google", options =>
    {
        options.Authority = "https://accounts.google.com";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer   = true,
            ValidIssuers     = ["https://accounts.google.com", "accounts.google.com"],
            ValidateAudience = true,
            ValidAudience    = googleClientId,
            ValidateLifetime = true,
        };
    })
    .AddJwtBearer("Microsoft", options =>
    {
        // Use "common" endpoint to support both organizational AND personal Microsoft accounts
        options.Authority = "https://login.microsoftonline.com/common/v2.0";
        options.MetadataAddress = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Disable issuer validation because tokens from "common" endpoint
            // will have different issuers (organizational vs personal accounts).
            // Security still maintained via signature + audience validation.
            ValidateIssuer   = false,
            ValidateAudience = true,
            ValidAudiences   = [microsoftClientId, $"api://{microsoftClientId}"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,  // Signature validation ensures token is from Microsoft
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    if (builder.Environment.IsDevelopment())
    {
        allowedOrigins = ["http://localhost:4200"];
        Console.WriteLine("⚠️  No CORS origins configured — falling back to http://localhost:4200 (Development only).");
    }
    else
    {
        throw new InvalidOperationException(
            "Required configuration 'Cors:AllowedOrigins' is missing or empty. " +
            "Ensure it is configured before starting in non-Development environments.");
    }
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ── Swagger / Controllers ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Middleware pipeline ───────────────────────────────────────────────────────
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();