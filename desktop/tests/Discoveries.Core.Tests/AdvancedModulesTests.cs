using Discoveries.Core.Composition;
using Discoveries.Core.Costs;
using Discoveries.Core.Domain;
using Discoveries.Core.Export;
using Discoveries.Core.Guard;
using Discoveries.Core.Media;
using Discoveries.Core.Zoom;

namespace Discoveries.Core.Tests;

public class ExportPresetTests
{
    [Fact]
    public void Defaults_cover_requested_formats_and_are_valid()
    {
        var d = ExportPresetCatalog.Defaults;
        Assert.Equal(6, d.Count);
        Assert.All(d, p => Assert.Empty(p.Validate()));
        Assert.Equal("16:9", d.Single(p => p.Id == "youtube-16x9").AspectLabel);
        Assert.All(d.Where(p => p.Id != "youtube-16x9"), p => Assert.Equal("9:16", p.AspectLabel));
        Assert.Equal(3840, d.Single(p => p.Id == "master-4k").Height);
    }

    [Fact]
    public void Odd_or_zero_values_are_rejected()
    {
        var bad = ExportPresetCatalog.Defaults[0] with { Width = 1081, Fps = 0, Name = "" };
        Assert.Equal(["name", "width", "fps"], bad.Validate());
    }

    [Fact]
    public void Store_saves_edits_and_resets()
    {
        var root = Path.Combine(Path.GetTempPath(), "presets-" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new ExportPresetStore(new AppPaths(root));
            var edited = store.Load().Select(p => p.Id == "tiktok-9x16" ? p with { Fps = 30 } : p).ToList();
            store.Save(edited);
            Assert.Equal(30, new ExportPresetStore(new AppPaths(root)).Load().Single(p => p.Id == "tiktok-9x16").Fps);
            Assert.Throws<ArgumentException>(() => store.Save([edited[0] with { Height = 0 }]));
            Assert.Equal(25, store.ResetToDefaults().Single(p => p.Id == "tiktok-9x16").Fps);
        }
        finally { Directory.Delete(root, true); }
    }
}

public class FrameCompositionTests
{
    [Fact]
    public void Well_framed_subject_has_no_findings()
    {
        var f = FrameCompositionAnalyzer.Analyze(new FrameObservation(0.3, 0.08, 0.4, 0.9, EyeLineY: 0.33));
        Assert.Empty(f);
    }

    [Fact]
    public void Detects_headroom_eyeline_leading_room_and_tilt()
    {
        var f = FrameCompositionAnalyzer.Analyze(new FrameObservation(
            0.5, 0.01, 0.4, 0.9, EyeLineY: 0.5, Facing: Facing.Right, HorizonTiltDegrees: 3.2, BackgroundDistractions: 2));
        var codes = f.Select(x => x.Code).ToHashSet();
        Assert.Contains("headroom_too_little", codes);
        Assert.Contains("eyeline_too_low", codes);
        Assert.Contains("leading_room_right", codes);
        Assert.Contains("horizon_tilted", codes);
        Assert.Contains("background_distractions", codes);
    }

    [Fact]
    public void Invalid_coordinates_throw() =>
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            FrameCompositionAnalyzer.Analyze(new FrameObservation(0.8, 0.1, 0.5, 0.5)));
}

public class KenBurnsTests
{
    private static void AssertInside(CropRect r, int w, int h)
    {
        Assert.InRange(r.X, -0.001, w); Assert.InRange(r.Y, -0.001, h);
        Assert.True(r.X + r.Width <= w + 0.001 && r.Y + r.Height <= h + 0.001, $"{r} outside {w}x{h}");
    }

    [Theory]
    [InlineData(CameraMotion.SlowZoomIn)]
    [InlineData(CameraMotion.SlowZoomOut)]
    [InlineData(CameraMotion.KenBurns)]
    [InlineData(CameraMotion.PanLeftToRight)]
    [InlineData(CameraMotion.PanRightToLeft)]
    public void Windows_stay_inside_source_and_keep_output_aspect(CameraMotion motion)
    {
        var plan = KenBurnsPlanner.Plan(4000, 2250, 1080, 1920, motion, 6, 25, 1.25, 0.7, 0.4);
        AssertInside(plan.Start, 4000, 2250);
        AssertInside(plan.End, 4000, 2250);
        Assert.Equal(1080.0 / 1920, plan.Start.Width / plan.Start.Height, 1e-6);
        Assert.Equal(1080.0 / 1920, plan.End.Width / plan.End.Height, 1e-6);
        Assert.Equal(150, plan.FrameCount);
        Assert.Contains("1080", plan.FfmpegFilter);
    }

    [Fact]
    public void Zoom_in_shrinks_window_and_uses_zoompan()
    {
        var plan = KenBurnsPlanner.Plan(1920, 1080, 1080, 1920, CameraMotion.SlowZoomIn, 4, 25, 1.2);
        Assert.True(plan.End.Width < plan.Start.Width);
        Assert.Contains("zoompan=", plan.FfmpegFilter);
        Assert.Contains("s=1080x1920", plan.FfmpegFilter);
    }

    [Fact]
    public void Pan_moves_horizontally_with_fixed_size()
    {
        var plan = KenBurnsPlanner.Plan(1920, 1080, 1080, 1920, CameraMotion.PanLeftToRight, 4);
        Assert.Equal(0, plan.Start.X);
        Assert.True(plan.End.X > plan.Start.X);
        Assert.Equal(plan.Start.Width, plan.End.Width);
        Assert.StartsWith("crop=w=", plan.FfmpegFilter);
    }

    [Fact]
    public void Invalid_zoom_rejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => KenBurnsPlanner.Plan(100, 100, 100, 100, CameraMotion.SlowZoomIn, 1, 25, 5));
}

public class CostTests
{
    [Fact]
    public void Estimates_and_actuals_and_currencies_are_never_mixed()
    {
        var ep = Guid.NewGuid();
        var at = new DateTime(2026, 11, 5, 0, 0, 0, DateTimeKind.Utc);
        var entries = new[]
        {
            new CostEntry { DateUtc = at, Category = CostCategory.Equipment, Kind = CostKind.Actual, Amount = 120m, EpisodeId = ep },
            new CostEntry { DateUtc = at, Category = CostCategory.AiApi, Kind = CostKind.Estimated, Amount = 2.5m, EpisodeId = ep },
            new CostEntry { DateUtc = at, Category = CostCategory.Storage, Kind = CostKind.Actual, Amount = 10m, Currency = "USD" },
            new CostEntry { DateUtc = at.AddMonths(-1), Category = CostCategory.Production, Kind = CostKind.Actual, Amount = 999m },
        };
        var r = CostCalculator.Monthly(entries, 2026, 11);
        var eur = r.Totals.Single(t => t.Currency == "EUR");
        Assert.Equal(120m, eur.Actual);
        Assert.Equal(2.5m, eur.Estimated);
        Assert.Equal(10m, r.Totals.Single(t => t.Currency == "USD").Actual);

        var b = CostCalculator.Budget(entries, ep, 200m);
        Assert.Equal(80m, b.RemainingAfterActual);
        Assert.Equal(77.5m, b.RemainingIncludingEstimates);
        Assert.False(b.OverBudgetActual);
    }

    [Fact]
    public void Ai_estimate_is_marked_estimated()
    {
        var e = CostCalculator.EstimateAiCall("anthropic", "model", 1_000_000, 500_000, 3m, 15m, "usd", DateTime.UtcNow);
        Assert.Equal(CostKind.Estimated, e.Kind);
        Assert.Equal(10.5m, e.Amount);
        Assert.Equal("USD", e.Currency);
    }

    [Fact]
    public void Negative_amount_rejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => CostCalculator.Validate(new CostEntry { Amount = -1 }));
}

public sealed class ProjectGuardTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "guard-" + Guid.NewGuid().ToString("N"));
    public ProjectGuardTests() => Directory.CreateDirectory(_dir);
    public void Dispose() { try { Directory.Delete(_dir, true); } catch { } }

    [Fact]
    public async Task Detects_missing_changed_and_tampered_media_without_touching_it()
    {
        var ok = Path.Combine(_dir, "ok.mp4"); File.WriteAllText(ok, "aaaa");
        var tampered = Path.Combine(_dir, "t.mp4"); File.WriteAllText(tampered, "bbbb");
        var resized = Path.Combine(_dir, "r.mp4"); File.WriteAllText(resized, "cc");
        var assets = new[]
        {
            new MediaAsset { StoredPath = ok, SizeBytes = 4, Sha256 = await FileHasher.Sha256Async(ok) },
            new MediaAsset { StoredPath = tampered, SizeBytes = 4, Sha256 = new string('0', 64) },
            new MediaAsset { StoredPath = resized, SizeBytes = 99 },
            new MediaAsset { StoredPath = Path.Combine(_dir, "gone.mp4"), SizeBytes = 1 },
        };
        var report = await ProjectGuard.CheckMediaAsync(assets, verifyHashes: true);
        Assert.Equal(4, report.Checked);
        Assert.Equal([IntegrityProblem.HashMismatch, IntegrityProblem.SizeChanged, IntegrityProblem.Missing],
            report.Issues.Select(i => i.Problem));
        Assert.Equal("bbbb", File.ReadAllText(tampered));
    }

    [Fact]
    public void Reports_missing_episode_subfolders()
    {
        Directory.CreateDirectory(Path.Combine(_dir, "Script"));
        var missing = ProjectGuard.MissingEpisodeFolders(_dir);
        Assert.DoesNotContain("Script", missing);
        Assert.Contains("Camera_Originals", missing);
    }
}
