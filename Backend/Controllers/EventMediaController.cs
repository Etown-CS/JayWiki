using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/media")]
public class EventMediaController : ProjectBaseController
{
    private readonly IBlobStorageService _blobStorage;
    private readonly IConfiguration     _configuration;

    private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    private static readonly string[] AllowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
    private const long MaxImageBytes = 10  * 1024 * 1024; // 10 MB
    private const long MaxVideoBytes = 100 * 1024 * 1024; // 100 MB

    public EventMediaController(
        ApplicationDbContext context,
        IBlobStorageService  blobStorage,
        IConfiguration       configuration)
        : base(context)
    {
        _blobStorage   = blobStorage;
        _configuration = configuration;
    }

    // ─── GET /api/events/{eventId}/media ──────────────────────────────────────
    /// <summary>
    /// List all media attached to an event. Public.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetMedia(int eventId)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var media = await _context.EventMedia
            .Where(m => m.EventId == eventId)
            .Select(m => new
            {
                m.EventMediaId,
                m.EventId,
                m.MediaType,
                m.Url
            })
            .ToListAsync();

        return Ok(media);
    }

    // ─── POST /api/events/{eventId}/media ─────────────────────────────────────
    /// <summary>
    /// Add media to an event. Requires authentication.
    ///
    /// For MediaType "link":  send { MediaType, Url } as JSON or form fields — no file needed.
    /// For MediaType "image" or "video": send multipart/form-data with File + MediaType fields.
    ///
    /// File size limits: image 10 MB, video 100 MB.
    /// </summary>
    [HttpPost]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddMedia(int eventId, [FromForm] AddEventMediaRequest request)
    {
        var eventExists = await _context.Events.AnyAsync(e => e.EventId == eventId);
        if (!eventExists)
            return NotFound(new { message = $"Event {eventId} not found." });

        var validTypes = new[] { "image", "video", "link" };
        var mediaType  = request.MediaType?.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(mediaType) || !validTypes.Contains(mediaType))
            return BadRequest(new { message = $"MediaType must be one of: {string.Join(", ", validTypes)}." });

        string url;

        if (mediaType == "link")
        {
            if (string.IsNullOrWhiteSpace(request.Url))
                return BadRequest(new { message = "Url is required for link media." });
            url = request.Url.Trim();
        }
        else
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest(new { message = $"File is required for {mediaType} media." });

            if (mediaType == "image")
            {
                if (!AllowedImageTypes.Contains(request.File.ContentType))
                    return BadRequest(new { message = "Image must be JPEG, PNG, GIF, or WEBP." });
                if (request.File.Length > MaxImageBytes)
                    return BadRequest(new { message = "Image exceeds 10 MB limit." });
            }
            else // video
            {
                if (!AllowedVideoTypes.Contains(request.File.ContentType))
                    return BadRequest(new { message = "Video must be MP4, MOV, WEBM, or AVI." });
                if (request.File.Length > MaxVideoBytes)
                    return BadRequest(new { message = "Video exceeds 100 MB limit." });
            }

            var containerName = _configuration["BlobStorage:EventMediaContainer"]
                ?? throw new InvalidOperationException("BlobStorage:EventMediaContainer is not configured.");

            url = await _blobStorage.UploadMediaAsync(request.File, containerName, eventId);
        }

        var media = new EventMedia
        {
            EventId   = eventId,
            MediaType = mediaType,
            Url       = url
        };

        _context.EventMedia.Add(media);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMedia), new { eventId }, new
        {
            media.EventMediaId,
            media.EventId,
            media.MediaType,
            media.Url
        });
    }

    // ─── DELETE /api/events/{eventId}/media/{id} ──────────────────────────────
    /// <summary>
    /// Delete a media entry. Uploaded blobs are deleted from Azure (best-effort).
    /// Links are removed from the DB only. Requires authentication.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteMedia(int eventId, int id)
    {
        var media = await _context.EventMedia
            .FirstOrDefaultAsync(m => m.EventMediaId == id && m.EventId == eventId);

        if (media == null)
            return NotFound(new { message = $"Media {id} not found for event {eventId}." });

        // Best-effort blob cleanup — only applies to uploaded files, not stored links
        if (media.MediaType != "link")
        {
            try { await _blobStorage.DeleteBlobAsync(media.Url); }
            catch { /* Non-fatal: DB record removal proceeds regardless */ }
        }

        _context.EventMedia.Remove(media);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTO ──────────────────────────────────────────────────────────────

public class AddEventMediaRequest
{
    /// <summary>"image" | "video" | "link"</summary>
    public string?    MediaType { get; set; }

    /// <summary>Required when MediaType is "link".</summary>
    public string?    Url       { get; set; }

    /// <summary>Required when MediaType is "image" or "video".</summary>
    public IFormFile? File      { get; set; }
}
