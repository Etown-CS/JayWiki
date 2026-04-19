using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserIdentity> UserIdentities { get; set; } = null!;
    public DbSet<Social> Socials { get; set; } = null!;
    public DbSet<Course> Courses { get; set; } = null!;
    public DbSet<CourseCatalog> CourseCatalog { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Topic> Topics { get; set; } = null!;
    public DbSet<ProjectMedia> ProjectMedia { get; set; } = null!;
    public DbSet<ProjectCollaborator> ProjectCollaborators { get; set; } = null!;
    public DbSet<Event> Events { get; set; } = null!;
    public DbSet<EventRegistration> EventRegistrations { get; set; } = null!;
    public DbSet<EventMedia> EventMedia { get; set; } = null!;
    public DbSet<Award> Awards { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────────────────────
        // Email and AuthProvider removed from User — now live in UserIdentity
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasDefaultValue("student");

        // ── UserIdentity ──────────────────────────────────────────────────────
        // Unique per provider+email combination — prevents duplicate linked accounts
        modelBuilder.Entity<UserIdentity>(entity =>
        {
            entity.HasKey(e => e.IdentityId);
            entity.HasIndex(e => new { e.Provider, e.ProviderEmail }).IsUnique();

            entity.HasOne(e => e.User)
                .WithMany(u => u.Identities)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── CourseCatalog ─────────────────────────────────────────────────────
        // Unique course code; restrict delete so removing an instructor
        // doesn't cascade-delete the catalog entries they created
        modelBuilder.Entity<CourseCatalog>(entity =>
        {
            entity.HasKey(e => e.CatalogId);
            entity.HasIndex(e => e.CourseCode).IsUnique();

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Course (enrollment) ───────────────────────────────────────────────
        // Restrict delete so removing a catalog entry doesn't wipe enrollments
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasOne(e => e.Catalog)
                .WithMany(c => c.Courses)
                .HasForeignKey(e => e.CatalogId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Project ───────────────────────────────────────────────────────────
        // Primary ownership via User (NoAction to avoid multiple cascade paths)
        // Course association is optional — deleting a course does not delete projects
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasOne(p => p.User)
                .WithMany(u => u.Projects)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(p => p.Course)
                .WithMany(c => c.Projects)
                .HasForeignKey(p => p.CourseId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── ProjectCollaborator ───────────────────────────────────────────────
        // Unique per project+user; cascade from project but not from user
        // (NoAction on user side avoids multiple cascade path conflict)
        modelBuilder.Entity<ProjectCollaborator>(entity =>
        {
            entity.HasIndex(e => new { e.ProjectId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Collaborators)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Collaborations)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── EventRegistration ─────────────────────────────────────────────────
        // Unique per user+event — prevents duplicate registrations
        modelBuilder.Entity<EventRegistration>()
            .HasIndex(er => new { er.UserId, er.EventId })
            .IsUnique();

        // ── Award ──────────────────────────────────────────────────────────────
        // Award → Event: optional, no cascade (event delete doesn't wipe awards)
        modelBuilder.Entity<Award>()
            .HasOne(a => a.Event)
            .WithMany(e => e.Awards)
            .HasForeignKey(a => a.EventId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // Award → User: optional
        modelBuilder.Entity<Award>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}