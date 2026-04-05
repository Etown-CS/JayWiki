using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/users/{userId}/courses")]
public class CoursesController : ProjectBaseController
{
    public CoursesController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/users/{userId}/courses ──────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourses(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var courses = await _context.Courses
            .Where(c => c.UserId == userId)
            .Include(c => c.Catalog)
            .Select(c => new
            {
                c.CourseId,
                c.UserId,
                c.Semester,
                c.Year,
                c.Instructor,
                Course = new
                {
                    c.Catalog.CatalogId,
                    c.Catalog.CourseCode,
                    c.Catalog.CourseName,
                    c.Catalog.Department,
                    c.Catalog.Credits
                }
            })
            .OrderByDescending(c => c.Year)
            .ThenBy(c => c.Semester)
            .ToListAsync();

        return Ok(courses);
    }

    // ─── GET /api/users/{userId}/courses/{id} ─────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourse(int userId, int id)
    {
        var enrollment = await _context.Courses
            .Include(c => c.Catalog)
            .Include(c => c.Projects)
            .FirstOrDefaultAsync(c => c.CourseId == id && c.UserId == userId);

        if (enrollment == null)
            return NotFound(new { message = $"Course {id} not found for user {userId}." });

        return Ok(new
        {
            enrollment.CourseId,
            enrollment.UserId,
            enrollment.Semester,
            enrollment.Year,
            enrollment.Instructor,
            Course = new
            {
                enrollment.Catalog.CatalogId,
                enrollment.Catalog.CourseCode,
                enrollment.Catalog.CourseName,
                enrollment.Catalog.Department,
                enrollment.Catalog.Credits
            },
            Projects = enrollment.Projects.Select(p => new
            {
                p.ProjectId,
                p.Title,
                p.Status,
                p.GithubUrl,
                p.DemoUrl
            })
        });
    }

    // ─── POST /api/users/{userId}/courses ──────────────────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateCourse(int userId, [FromBody] CreateEnrollmentRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        // Students can only enroll themselves
        if (currentUser.UserId != userId && !await IsInstructorOrAdminAsync())
            return Forbid();

        var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
        if (!userExists)
            return NotFound(new { message = $"User {userId} not found." });

        var catalogExists = await _context.CourseCatalog.AnyAsync(c => c.CatalogId == request.CatalogId);
        if (!catalogExists)
            return NotFound(new { message = $"Course catalog entry {request.CatalogId} not found." });

        if (string.IsNullOrWhiteSpace(request.Semester))
            return BadRequest(new { message = "Semester is required." });

        // Prevent duplicate enrollment in same course/semester/year
        var duplicate = await _context.Courses.AnyAsync(c =>
            c.UserId == userId &&
            c.CatalogId == request.CatalogId &&
            c.Semester == request.Semester &&
            c.Year == request.Year);
        if (duplicate)
            return Conflict(new { message = "User is already enrolled in this course for that semester and year." });

        var enrollment = new Course
        {
            UserId = userId,
            CatalogId = request.CatalogId,
            Semester = request.Semester.Trim(),
            Year = request.Year,
            Instructor = request.Instructor?.Trim()
        };

        _context.Courses.Add(enrollment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourse),
            new { userId, id = enrollment.CourseId },
            new { enrollment.CourseId, enrollment.UserId, enrollment.CatalogId, enrollment.Semester, enrollment.Year, enrollment.Instructor });
    }

    // ─── PUT /api/users/{userId}/courses/{id} ─────────────────────────────────
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateCourse(int userId, int id, [FromBody] UpdateEnrollmentRequest request)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (currentUser.UserId != userId && !await IsInstructorOrAdminAsync())
            return Forbid();

        var enrollment = await _context.Courses
            .FirstOrDefaultAsync(c => c.CourseId == id && c.UserId == userId);

        if (enrollment == null)
            return NotFound(new { message = $"Course {id} not found for user {userId}." });

        // Fix #2 — normalize inputs before comparison
        var semester  = request.Semester?.Trim() ?? enrollment.Semester;
        var year      = request.Year ?? enrollment.Year;
        var instructor = request.Instructor?.Trim() ?? enrollment.Instructor;

        // Fix #1 — duplicate check excluding current record
        var duplicate = await _context.Courses.AnyAsync(c =>
            c.UserId == userId &&
            c.CatalogId == enrollment.CatalogId &&
            c.Semester == semester &&
            c.Year == year &&
            c.CourseId != id);  // ← exclude self

        if (duplicate)
            return Conflict(new { message = "User is already enrolled in this course for that semester and year." });

        enrollment.Semester   = semester;
        enrollment.Year       = year;
        enrollment.Instructor = instructor;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            enrollment.CourseId,
            enrollment.UserId,
            enrollment.CatalogId,
            enrollment.Semester,
            enrollment.Year,
            enrollment.Instructor
        });
    }

    // ─── DELETE /api/users/{userId}/courses/{id} ──────────────────────────────
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteCourse(int userId, int id)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser == null) return Unauthorized(new { message = "User not found." });

        if (currentUser.UserId != userId && !await IsInstructorOrAdminAsync())
            return Forbid();

        var enrollment = await _context.Courses
            .FirstOrDefaultAsync(c => c.CourseId == id && c.UserId == userId);

        if (enrollment == null)
            return NotFound(new { message = $"Course {id} not found for user {userId}." });

        _context.Courses.Remove(enrollment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateEnrollmentRequest(int CatalogId, string Semester, int Year, string? Instructor);
public record UpdateEnrollmentRequest(string? Semester, int? Year, string? Instructor);