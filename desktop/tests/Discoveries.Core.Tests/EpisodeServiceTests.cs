using Discoveries.Core;
using Discoveries.Core.Domain;
using Discoveries.Core.Script;
using Discoveries.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Discoveries.Core.Tests;

/// <summary>Integration tests against a real SQLite database (in-memory connection).</summary>
public sealed class EpisodeServiceTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly string _root = Path.Combine(Path.GetTempPath(), "discoveries-ep-" + Guid.NewGuid().ToString("N"));
    private readonly EpisodeService _svc;
    private readonly Factory _factory;

    private sealed class Factory(DbContextOptions<StudioDbContext> o) : IDbContextFactory<StudioDbContext>
    {
        public StudioDbContext CreateDbContext() => new(o);
    }

    public EpisodeServiceTests()
    {
        _conn.Open();
        var options = new DbContextOptionsBuilder<StudioDbContext>().UseSqlite(_conn).Options;
        _factory = new Factory(options);
        using (var db = _factory.CreateDbContext()) DatabaseInitializer.Initialize(db);
        _svc = new EpisodeService(_factory, new AppPaths(_root));
    }

    public void Dispose()
    {
        _conn.Dispose();
        try { Directory.Delete(_root, true); } catch { }
    }

    [Fact]
    public async Task Create_assigns_sequential_numbers_and_folders()
    {
        var a = await _svc.CreateAsync("الحلقة الأولى");
        var b = await _svc.CreateAsync("");
        Assert.Equal(1, a.EpisodeNumber);
        Assert.Equal(2, b.EpisodeNumber);
        Assert.Equal("Episode 002", b.Title);
        Assert.True(Directory.Exists(Path.Combine(a.ProjectFolder!, "Camera_Originals")));
    }

    [Fact]
    public async Task Numbers_are_not_reused_after_archive()
    {
        var a = await _svc.CreateAsync("A");
        await _svc.ArchiveAsync(a.Id);
        var b = await _svc.CreateAsync("B");
        Assert.Equal(2, b.EpisodeNumber);
    }

    [Fact]
    public async Task Archive_hides_keeps_files_and_restore_returns_previous_status()
    {
        var a = await _svc.CreateAsync("A");
        await _svc.UpdateAsync(a.Id, "A", "", "ar", null, "", EpisodeStatus.Active);
        var marker = Path.Combine(a.ProjectFolder!, "Camera_Originals", "C0001.MP4");
        await File.WriteAllTextAsync(marker, "original");

        await _svc.ArchiveAsync(a.Id);
        Assert.Empty(await _svc.ListAsync());
        Assert.Single(await _svc.ListAsync(includeArchived: true));
        Assert.True(File.Exists(marker));

        await _svc.RestoreAsync(a.Id);
        Assert.Equal(EpisodeStatus.Active, (await _svc.GetAsync(a.Id))!.Status);
    }

    [Fact]
    public async Task Search_matches_title_description_number()
    {
        var a = await _svc.CreateAsync("بابل القديمة");
        await _svc.CreateAsync("Ur");
        Assert.Single(await _svc.ListAsync("بابل"));
        Assert.Single(await _svc.ListAsync("1"));
        Assert.Equal(a.Id, (await _svc.ListAsync("بابل"))[0].Id);
    }

    [Fact]
    public async Task Analyze_and_duplicate_copy_scenes()
    {
        var a = await _svc.CreateAsync("A");
        await _svc.UpdateAsync(a.Id, "A", "d", "ar", 600, "مقدمة.\n\nمشهد أول. جملة ثانية.\n\nخاتمة.");
        var parsed = await _svc.AnalyzeScriptAsync(a.Id, new ScriptParser());
        Assert.Equal(3, parsed.Scenes.Count);

        // Re-analysis must not duplicate scenes.
        await _svc.AnalyzeScriptAsync(a.Id, new ScriptParser());
        var reloaded = await _svc.GetAsync(a.Id);
        Assert.Equal(3, reloaded!.Scenes.Count);
        Assert.Equal(4, reloaded.Scenes.Sum(s => s.Shots.Count));

        var copy = await _svc.DuplicateAsync(a.Id, "(نسخة)");
        Assert.Equal(2, copy.EpisodeNumber);
        Assert.Equal("A (نسخة)", copy.Title);
        Assert.Equal(3, copy.Scenes.Count);
        Assert.Equal(600, copy.TargetDurationSeconds);
    }

    [Fact]
    public async Task Stats_and_operation_log()
    {
        await _svc.CreateAsync("A");
        var stats = await _svc.GetStatsAsync();
        Assert.Equal(1, stats.Total);
        Assert.Equal("A", stats.LastUpdated!.Title);
        Assert.NotEmpty(await _svc.RecentOperationsAsync());
    }

    [Fact]
    public async Task Delete_record_keeps_files()
    {
        var a = await _svc.CreateAsync("A");
        await _svc.UpdateAsync(a.Id, "A", "", "ar", null, "مشهد. آخر.");
        await _svc.AnalyzeScriptAsync(a.Id, new ScriptParser());
        var media = Path.Combine(a.ProjectFolder!, "Camera_Originals", "C0001.MP4");
        await File.WriteAllTextAsync(media, "original");

        await _svc.DeleteRecordAsync(a.Id);

        Assert.Null(await _svc.GetAsync(a.Id));
        Assert.True(File.Exists(media));
        Assert.Equal("original", await File.ReadAllTextAsync(media));
        Assert.Equal(2, (await _svc.CreateAsync("B")).EpisodeNumber); // number 1 is never reused
    }
}
