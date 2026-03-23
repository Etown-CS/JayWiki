using System.IdentityModel.Tokens.Jwt;
using Backend.Data;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;

// ── Load .env BEFORE building the host ───────────────────────────────────────
var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
if (File.Exists(envPath))
    Env.Load(envPath);

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "The connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// ── Authentication — dual JWT Bearer (Google + Microsoft) ─────────────────────
var googleClientId    = builder.Configuration["Authentication:Google:ClientId"]!;
var microsoftClientId = builder.Configuration["Authentication:Microsoft:ClientId"]!;
var microsoftTenantId = builder.Configuration["Authentication:Microsoft:TenantId"]!;

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
                    var issuer = handler.ReadJwtToken(token).Issuer;
                    if (issuer.Contains("accounts.google.com",
                            StringComparison.OrdinalIgnoreCase))
                        return "Google";
                    if (issuer.Contains("login.microsoftonline.com",
                            StringComparison.OrdinalIgnoreCase))
                        return "Microsoft";
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
            ValidIssuer      = "https://accounts.google.com",
            ValidateAudience = true,
            ValidAudience    = googleClientId,
            ValidateLifetime = true,
        };
    })
    .AddJwtBearer("Microsoft", options =>
    {
        options.Authority = $"https://login.microsoftonline.com/{microsoftTenantId}/v2.0";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer   = true,
            ValidIssuer      = $"https://login.microsoftonline.com/{microsoftTenantId}/v2.0",
            ValidateAudience = true,
            ValidAudience    = microsoftClientId,
            ValidateLifetime = true,
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

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

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();