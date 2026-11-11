using Discoveries.Core;
using Discoveries.Core.Domain;
using Discoveries.Core.Script;
using Microsoft.EntityFrameworkCore;

namespace Discoveries.Data;

public sealed record EpisodeStats(int Total, int Active, int Archived, Episode? LastUpdated, int PendingApprovals);

public sealed class EpisodeService(IDbContextFactory<StudioDbContext> factory, AppPaths paths, TimeProvider? clock = null)
{
    private const string EpisodeCounterKey = "episode-number";
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;
    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    public async Task<IReadOnlyList<Episode>> ListAsync(string? search = null, bool includeArchived = false, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var query = db.Episodes.AsNoTracking();
        if (!includeArchived) query = query.Where(e => e.Status != EpisodeStatus.Archived);
        var list = await query.ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            list = list.Where(e =>
                    e.Title.Contains(s, StringComparison.OrdinalIgnoreCase)
                    || e.Description.Contains(s, StringComparison.OrdinalIgnoreCase)
                    || e.ScriptText.Contains(s, StringComparison.OrdinalIgnoreCase)
                    || e.EpisodeNumber.ToString() == s)
                .ToList();
        }
        return list.OrderByDescending(e => e.EpisodeNumber).ToList();
    }

    public async Task<Episode?> GetAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        return await db.Episodes.AsNoTracking()
            .Include(e => e.Scenes).ThenInclude(s => s.Shots)
            .FirstOrDefaultAsync(e => e.Id == id, ct);
    }

    /// <summary>Creates an episode with the next number. Numbers are never reused, archived
    /// episodes included.</summary>
    public async Task<Episode> CreateAsync(string title, string language = "ar", CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var counter = await db.Counters.FindAsync([EpisodeCounterKey], ct);
        if (counter is null) { counter = new AppCounter { Key = EpisodeCounterKey }; db.Counters.Add(counter); }
        var maxExisting = await db.Episodes.MaxAsync(e => (int?)e.EpisodeNumber, ct) ?? 0;
        var next = Math.Max(counter.Value, maxExisting) + 1;
        counter.Value = next;
        var episode = new Episode
        {
            EpisodeNumber = next,
            Title = string.IsNullOrWhiteSpace(title) ? $"Episode {next:000}" : title.Trim(),
            Language = language,
            CreatedAtUtc = Now,
            UpdatedAtUtc = Now,
            ProjectFolder = paths.EpisodeFolder(next),
        };
        CreateProjectFolders(episode.ProjectFolder);
        db.Episodes.Add(episode);
        Log(db, "Episode", $"Created episode {next:000} — {episode.Title}");
        await db.SaveChangesAsync(ct);
        return episode;
    }

    public async Task UpdateAsync(Guid id, string title, string description, string language, int? targetDurationSeconds, string scriptText, EpisodeStatus? status = null, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var e = await db.Episodes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        e.Title = title.Trim();
        e.Description = description;
        e.Language = language;
        e.TargetDurationSeconds = targetDurationSeconds;
        e.ScriptText = scriptText;
        if (status is { } st && st != EpisodeStatus.Archived) e.Status = st;
        e.UpdatedAtUtc = Now;
        Log(db, "Episode", $"Saved episode {e.EpisodeNumber:000}");
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Duplicates text, metadata and scene breakdown. Media files are not copied.</summary>
    public async Task<Episode> DuplicateAsync(Guid id, string copySuffix, CancellationToken ct = default)
    {
        var source = await GetAsync(id, ct) ?? throw new KeyNotFoundException();
        var copy = await CreateAsync($"{source.Title} {copySuffix}".Trim(), source.Language, ct);
        await UpdateAsync(copy.Id, copy.Title, source.Description, source.Language, source.TargetDurationSeconds, source.ScriptText, ct: ct);

        await using var db = await factory.CreateDbContextAsync(ct);
        foreach (var scene in source.Scenes.OrderBy(s => s.Number))
        {
            db.Scenes.Add(new Scene
            {
                EpisodeId = copy.Id,
                Number = scene.Number,
                Section = scene.Section,
                Text = scene.Text,
                EstimatedSeconds = scene.EstimatedSeconds,
                Shots = scene.Shots.OrderBy(s => s.Number).Select(s => new Shot
                {
                    Number = s.Number, Voiceover = s.Voiceover, EstimatedSeconds = s.EstimatedSeconds,
                    Background = s.Background, Image = s.Image, BRoll = s.BRoll, Music = s.Music,
                    SoundEffect = s.SoundEffect, Movement = s.Movement, Transition = s.Transition,
                }).ToList(),
            });
        }
        Log(db, "Episode", $"Duplicated episode {source.EpisodeNumber:000} → {copy.EpisodeNumber:000}");
        await db.SaveChangesAsync(ct);
        return (await GetAsync(copy.Id, ct))!;
    }

    /// <summary>Archives the episode. No file is moved or deleted.</summary>
    public async Task ArchiveAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var e = await db.Episodes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (e.Status == EpisodeStatus.Archived) return;
        e.StatusBeforeArchive = e.Status;
        e.Status = EpisodeStatus.Archived;
        e.UpdatedAtUtc = Now;
        Log(db, "Episode", $"Archived episode {e.EpisodeNumber:000} (files kept)");
        await db.SaveChangesAsync(ct);
    }

    public async Task RestoreAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var e = await db.Episodes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (e.Status != EpisodeStatus.Archived) return;
        e.Status = e.StatusBeforeArchive ?? EpisodeStatus.Draft;
        e.StatusBeforeArchive = null;
        e.UpdatedAtUtc = Now;
        Log(db, "Episode", $"Restored episode {e.EpisodeNumber:000}");
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Deletes only the database record (scenes/shots cascade). The project folder and
    /// every media file in it are left untouched. The UI must ask for explicit confirmation.</summary>
    public async Task DeleteRecordAsync(Guid id, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var e = await db.Episodes.Include(x => x.Scenes).ThenInclude(s => s.Shots)
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        db.Episodes.Remove(e);
        Log(db, "Episode", $"Deleted record of episode {e.EpisodeNumber:000}; files kept in {e.ProjectFolder}");
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Re-builds the scene/shot breakdown from the saved script text.
    /// Returns the parsed result. Manual suggestion fields are kept when the voice-over text
    /// of a shot is unchanged.</summary>
    public async Task<ParsedScript> AnalyzeScriptAsync(Guid id, ScriptParser parser, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var e = await db.Episodes.Include(x => x.Scenes).ThenInclude(s => s.Shots)
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();

        var previous = e.Scenes.SelectMany(s => s.Shots)
            .GroupBy(s => s.Voiceover.Trim())
            .ToDictionary(g => g.Key, g => g.First());

        var parsed = parser.Parse(e.ScriptText);
        db.Scenes.RemoveRange(e.Scenes.ToList());
        e.Scenes.Clear();
        await db.SaveChangesAsync(ct);

        foreach (var ps in parsed.Scenes)
        {
            e.Scenes.Add(new Scene
            {
                EpisodeId = e.Id,
                Number = ps.Number,
                Section = ps.Section,
                Text = ps.Text,
                EstimatedSeconds = ps.EstimatedSeconds,
                Shots = ps.Shots.Select(sh =>
                {
                    var shot = new Shot { Number = sh.Number, Voiceover = sh.Text, EstimatedSeconds = sh.EstimatedSeconds };
                    if (previous.TryGetValue(sh.Text.Trim(), out var old))
                    {
                        shot.Background = old.Background; shot.Image = old.Image; shot.BRoll = old.BRoll;
                        shot.Music = old.Music; shot.SoundEffect = old.SoundEffect;
                        shot.Movement = old.Movement; shot.Transition = old.Transition;
                    }
                    return shot;
                }).ToList(),
            });
        }
        e.UpdatedAtUtc = Now;
        Log(db, "Script", $"Analyzed script of episode {e.EpisodeNumber:000}: {parsed.Scenes.Count} scenes, {parsed.ShotCount} shots");
        await db.SaveChangesAsync(ct);
        return parsed;
    }

    public async Task<EpisodeStats> GetStatsAsync(CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        var total = await db.Episodes.CountAsync(ct);
        var archived = await db.Episodes.CountAsync(e => e.Status == EpisodeStatus.Archived, ct);
        var active = await db.Episodes.CountAsync(e => e.Status == EpisodeStatus.Active || e.Status == EpisodeStatus.InReview, ct);
        var last = await db.Episodes.AsNoTracking().OrderByDescending(e => e.UpdatedAtUtc).FirstOrDefaultAsync(ct);
        var pending = await db.MediaAssets.CountAsync(a => a.Approval == ApprovalState.PendingApproval, ct);
        return new EpisodeStats(total, active, archived, last, pending);
    }

    public async Task<IReadOnlyList<MediaAsset>> RecentImportsAsync(int take = 5, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        return await db.MediaAssets.AsNoTracking().OrderByDescending(a => a.ImportedAtUtc).Take(take).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<OperationLogEntry>> RecentOperationsAsync(int take = 8, CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        return await db.Operations.AsNoTracking().OrderByDescending(o => o.Id).Take(take).ToListAsync(ct);
    }

    private void Log(StudioDbContext db, string category, string message) =>
        db.Operations.Add(new OperationLogEntry { AtUtc = Now, Category = category, Message = message });

    private static void CreateProjectFolders(string root)
    {
        foreach (var sub in AppPaths.EpisodeSubfolders)
            Directory.CreateDirectory(Path.Combine(root, sub));
    }
}
