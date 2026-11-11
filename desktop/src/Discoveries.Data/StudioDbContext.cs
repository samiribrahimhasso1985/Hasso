using Discoveries.Core.Domain;
using Microsoft.EntityFrameworkCore;

namespace Discoveries.Data;

public sealed class StudioDbContext(DbContextOptions<StudioDbContext> options) : DbContext(options)
{
    public DbSet<Episode> Episodes => Set<Episode>();
    public DbSet<Scene> Scenes => Set<Scene>();
    public DbSet<Shot> Shots => Set<Shot>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<ApprovalRecord> Approvals => Set<ApprovalRecord>();
    public DbSet<OperationLogEntry> Operations => Set<OperationLogEntry>();
    public DbSet<AppCounter> Counters => Set<AppCounter>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Guid keys are created in code (Guid.NewGuid()); entities reached through navigation
        // properties must therefore be treated as new rows, not as existing ones.
        b.Entity<Episode>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<Scene>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<Shot>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<MediaAsset>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<ApprovalRecord>().Property(x => x.Id).ValueGeneratedNever();

        b.Entity<Episode>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.EpisodeNumber).IsUnique();
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.StatusBeforeArchive).HasConversion<string>();
            e.HasMany(x => x.Scenes).WithOne().HasForeignKey(s => s.EpisodeId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Scene>(e =>
        {
            e.Property(x => x.Section).HasConversion<string>();
            e.HasMany(x => x.Shots).WithOne().HasForeignKey(s => s.SceneId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<MediaAsset>(e =>
        {
            e.Property(x => x.Kind).HasConversion<string>();
            e.Property(x => x.Approval).HasConversion<string>();
            e.HasIndex(x => x.Sha256);
        });
        b.Entity<ApprovalRecord>(e =>
        {
            e.Property(x => x.From).HasConversion<string>();
            e.Property(x => x.To).HasConversion<string>();
            e.Property(x => x.Actor).HasConversion<string>();
        });
        b.Entity<OperationLogEntry>(e => e.HasKey(x => x.Id));
        b.Entity<AppCounter>(e => e.HasKey(x => x.Key));
    }
}

public static class DatabaseInitializer
{
    /// <summary>Creates the database if needed. Schema migrations are introduced before the first
    /// schema change after 0.1.0 (see ROADMAP); existing data is never dropped.</summary>
    public static void Initialize(StudioDbContext db) => db.Database.EnsureCreated();
}
