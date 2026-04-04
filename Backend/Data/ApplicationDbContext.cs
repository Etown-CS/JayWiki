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
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Topic> Topics { get; set; } = null!;
    public DbSet<ProjectMedia> ProjectMedia { get; set; } = null!;
    public DbSet<Event> Events { get; set; } = null!;
    public DbSet<EventRegistration> EventRegistrations { get; set; } = null!;
    public DbSet<EventMedia> EventMedia { get; set; } = null!;
    public DbSet<Award> Awards { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

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
    }
}