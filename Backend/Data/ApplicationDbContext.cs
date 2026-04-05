using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Job> Jobs { get; set; } = null!;
    public DbSet<Social> Socials { get; set; } = null!;
    public DbSet<Course> Courses { get; set; } = null!;

    public DbSet<CourseCatalog> CourseCatalog { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Topic> Topics { get; set; } = null!;
    public DbSet<ProjectMedia> ProjectMedia { get; set; } = null!;
    public DbSet<Event> Events { get; set; } = null!;

    public DbSet<ProjectCollaborator> ProjectCollaborators { get; set; } = null!;
    public DbSet<EventMedia> EventMedia { get; set; } = null!;
    public DbSet<Award> Awards { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User -- default role and unique email
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasDefaultValue("student");

        // User -- unique email constraint
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Course Catalog → User (creator) with unique course code
        modelBuilder.Entity<CourseCatalog>(entity =>
        {
            entity.HasKey(e => e.CatalogId);
            entity.HasIndex(e => e.CourseCode).IsUnique();

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict); // don't cascade-delete catalog if user deleted
        });

        // Course → Course Catalog (required) and User (instructor, required)
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasOne(e => e.Catalog)
                .WithMany(c => c.Courses)
                .HasForeignKey(e => e.CatalogId)
                .OnDelete(DeleteBehavior.Restrict); // don't wipe enrollments if catalog entry deleted
        });

        // EventRegistration — composite unique constraint (user can't register twice)
        modelBuilder.Entity<EventRegistration>()
            .HasIndex(er => new { er.UserId, er.EventId })
            .IsUnique();

        // Project → User (primary ownership, required)
        modelBuilder.Entity<Project>()
            .HasOne(p => p.User)
            .WithMany(u => u.Projects)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.NoAction);

        // Project → Course (optional association)
        // SetNull so deleting a course doesn't delete the user's project
        modelBuilder.Entity<Project>()
            .HasOne(p => p.Course)
            .WithMany(c => c.Projects)
            .HasForeignKey(p => p.CourseId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.NoAction); // SQL Server can't handle SetNull + cascade from User

        // ProjectCollaborator — many-to-many join with extra fields
        // Unique constraint to prevent duplicate collaborations
        modelBuilder.Entity<ProjectCollaborator>(entity =>
        {
            entity.HasIndex(e => new { e.ProjectId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Collaborators)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}