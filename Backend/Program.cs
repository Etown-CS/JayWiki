using System.IdentityModel.Tokens.Jwt;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using System.Text;

// ── Load .env BEFORE building the host ───────────────────────────────────────
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

// ── Helper: fail fast on missing or placeholder config ────────────────────────
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

// ── Blob Storage ──────────────────────────────────────────────────────────────
var blobConnectionString = Environment.GetEnvironmentVariable("AZURE_BLOB_CONNECTION_STRING");
if (!string.IsNullOrWhiteSpace(blobConnectionString))
    builder.Configuration["BlobStorage:ConnectionString"] = blobConnectionString;

builder.Services.AddSingleton<IBlobStorageService, BlobStorageService>();

// ── Authentication — dual JWT Bearer (Google + Microsoft + Local) ─────────────
var googleClientId    = GetRequiredConfig(builder, "Authentication:Google:ClientId");
var microsoftClientId = GetRequiredConfig(builder, "Authentication:Microsoft:ClientId");
var localSigningKey   = Environment.GetEnvironmentVariable("JWT_SIGNING_KEY")
                        ?? GetRequiredConfig(builder, "Authentication:Local:SigningKey");

// Register JwtSigningConfig so AuthController can inject it
builder.Services.AddSingleton(new JwtSigningConfig
{
    SigningKey = localSigningKey,
    Issuer     = "jaywiki-api",
    Audience   = "jaywiki-app"
});

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
            var authHeader = context.Request.Headers[HeaderNames.Authorization].ToString();
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

                        if (issuer == "jaywiki-api")
                            return "Local";
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
        options.Authority       = "https://login.microsoftonline.com/common/v2.0";
        options.MetadataAddress = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = false,
            ValidateAudience         = true,
            ValidAudiences           = [microsoftClientId, $"api://{microsoftClientId}"],
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
        };
    })
    .AddJwtBearer("Local", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = "jaywiki-api",
            ValidateAudience         = true,
            ValidAudience            = "jaywiki-app",
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(localSigningKey))
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