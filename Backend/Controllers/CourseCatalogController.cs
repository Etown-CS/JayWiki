using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers;

[ApiController]
[Route("api/courses")]
public class CourseCatalogController : ProjectBaseController
{
    public CourseCatalogController(ApplicationDbContext context) : base(context) { }

    // ─── GET /api/courses ─────────────────────────────────────────────────────
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourses([FromQuery] string? department, [FromQuery] string? search)
    {
        var query = _context.CourseCatalog.AsQueryable();

        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(c => c.Department == department);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c =>
                c.CourseCode.Contains(search) ||
                c.CourseName.Contains(search));

        var courses = await query
            .Select(c => new
            {
                c.CatalogId,
                c.CourseCode,
                c.CourseName,
                c.Department,
                c.Credits,
                c.Description
            })
            .OrderBy(c => c.CourseCode)
            .ToListAsync();

        return Ok(courses);
    }

    // ─── GET /api/courses/{id} ────────────────────────────────────────────────
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourse(int id)
    {
        var course = await _context.CourseCatalog
            .FirstOrDefaultAsync(c => c.CatalogId == id);

        if (course == null)
            return NotFound(new { message = $"Course {id} not found." });

        return Ok(new
        {
            course.CatalogId,
            course.CourseCode,
            course.CourseName,
            course.Department,
            course.Credits,
            course.Description
        });
    }

    // ─── GET /api/courses/{id}/enrollments ────────────────────────────────────
    // Who took this course + their projects
    [HttpGet("{id}/enrollments")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEnrollments(int id)
    {
        var courseExists = await _context.CourseCatalog.AnyAsync(c => c.CatalogId == id);
        if (!courseExists)
            return NotFound(new { message = $"Course {id} not found." });

        var enrollments = await _context.Courses
            .Where(c => c.CatalogId == id)
            .Include(c => c.User)
            .Include(c => c.Projects)
            .Select(c => new
            {
                c.CourseId,
                c.Semester,
                c.Year,
                c.Instructor,
                Student = new { c.User.UserId, c.User.Name, c.User.Email },
                Projects = c.Projects.Select(p => new
                {
                    p.ProjectId,
                    p.Title,
                    p.Status,
                    p.GithubUrl,
                    p.DemoUrl
                })
            })
            .OrderBy(c => c.Year)
            .ThenBy(c => c.Semester)
            .ToListAsync();

        return Ok(enrollments);
    }

    // ─── POST /api/courses ────────────────────────────────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
    {
        if (!await IsInstructorOrAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.CourseCode) || string.IsNullOrWhiteSpace(request.CourseName))
            return BadRequest(new { message = "CourseCode and CourseName are required." });

        var duplicate = await _context.CourseCatalog
            .AnyAsync(c => c.CourseCode == request.CourseCode.Trim().ToUpper());
        if (duplicate)
            return Conflict(new { message = $"Course code '{request.CourseCode}' already exists in the catalog." });

        var currentUser = await GetCurrentUserAsync();

        var course = new CourseCatalog
        {
            CourseCode = request.CourseCode.Trim().ToUpper(),
            CourseName = request.CourseName.Trim(),
            Department = request.Department?.Trim(),
            Credits = request.Credits,
            Description = request.Description?.Trim(),
            CreatedByUserId = currentUser!.UserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.CourseCatalog.Add(course);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourse),
            new { id = course.CatalogId },
            new
            {
                course.CatalogId,
                course.CourseCode,
                course.CourseName,
                course.Department,
                course.Credits,
                course.Description
            });
    }

    // ─── PUT /api/courses/{id} ────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateCourse(int id, [FromBody] UpdateCourseRequest request)
    {
        if (!await IsInstructorOrAdminAsync())
            return Forbid();

        var course = await _context.CourseCatalog.FirstOrDefaultAsync(c => c.CatalogId == id);
        if (course == null)
            return NotFound(new { message = $"Course {id} not found." });

        if (string.IsNullOrWhiteSpace(request.CourseName))
            return BadRequest(new { message = "CourseName is required." });

        // If changing course code, check for duplicate
        if (!string.IsNullOrWhiteSpace(request.CourseCode) &&
            request.CourseCode.Trim().ToUpper() != course.CourseCode)
        {
            var duplicate = await _context.CourseCatalog
                .AnyAsync(c => c.CourseCode == request.CourseCode.Trim().ToUpper() && c.CatalogId != id);
            if (duplicate)
                return Conflict(new { message = $"Course code '{request.CourseCode}' already exists." });

            course.CourseCode = request.CourseCode.Trim().ToUpper();
        }

        course.CourseName = request.CourseName.Trim();
        course.Department = request.Department?.Trim();
        course.Credits = request.Credits;
        course.Description = request.Description?.Trim();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            course.CatalogId,
            course.CourseCode,
            course.CourseName,
            course.Department,
            course.Credits,
            course.Description
        });
    }

    // ─── DELETE /api/courses/{id} ─────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteCourse(int id)
    {
        if (!await IsInstructorOrAdminAsync())
            return Forbid();

        var course = await _context.CourseCatalog.FirstOrDefaultAsync(c => c.CatalogId == id);
        if (course == null)
            return NotFound(new { message = $"Course {id} not found." });

        // Prevent deleting if students are enrolled
        var hasEnrollments = await _context.Courses.AnyAsync(c => c.CatalogId == id);
        if (hasEnrollments)
            return Conflict(new { message = "Cannot delete a course that has student enrollments." });

        _context.CourseCatalog.Remove(course);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateCourseRequest(
    string CourseCode,
    string CourseName,
    string? Department,
    int? Credits,
    string? Description);

public record UpdateCourseRequest(
    string? CourseCode,
    string CourseName,
    string? Department,
    int? Credits,
    string? Description);