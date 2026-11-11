using System.Text.RegularExpressions;
using Discoveries.Core.Costs;
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
    public DbSet<CostEntry> Costs => Set<CostEntry>();

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
        b.Entity<CostEntry>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Category).HasConversion<string>();
            e.Property(x => x.Kind).HasConversion<string>();
            // SQLite has no decimal type; store as text to keep exact cents.
            e.Property(x => x.Amount).HasConversion<string>();
            e.HasIndex(x => x.EpisodeId);
        });
    }
}

public static partial class DatabaseInitializer
{
    /// <summary>Creates a new database, or adds tables introduced by newer versions to an existing
    /// one. Existing tables and rows are never dropped. (Column changes to existing tables will be
    /// handled by EF migrations when they first become necessary.)</summary>
    public static IReadOnlyList<string> Initialize(StudioDbContext db)
    {
        if (db.Database.EnsureCreated()) return [];
        return AddMissingTables(db);
    }

    [GeneratedRegex(@"^CREATE TABLE ""(?<t>[^""]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex CreateTableRegex();

    [GeneratedRegex(@"^CREATE (UNIQUE )?INDEX ""[^""]+"" ON ""(?<t>[^""]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex CreateIndexRegex();

    private static IReadOnlyList<string> AddMissingTables(StudioDbContext db)
    {
        var existing = db.Database
            .SqlQueryRaw<string>("SELECT name AS Value FROM sqlite_master WHERE type = 'table'")
            .ToList()
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var statements = Regex.Split(db.Database.GenerateCreateScript(), @";\s*(?:\r?\n|$)")
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .ToList();

        var created = new List<string>();
        foreach (var sql in statements)
        {
            var m = CreateTableRegex().Match(sql);
            if (m.Success && !existing.Contains(m.Groups["t"].Value))
            {
                db.Database.ExecuteSqlRaw(sql);
                created.Add(m.Groups["t"].Value);
            }
        }
        foreach (var sql in statements)
        {
            var m = CreateIndexRegex().Match(sql);
            if (m.Success && created.Contains(m.Groups["t"].Value)) db.Database.ExecuteSqlRaw(sql);
        }
        return created;
    }
}
