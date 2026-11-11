using System.Text.Json;

namespace Discoveries.Core.Export;

/// <summary>An editable render target. Values are suggested defaults, not official platform
/// requirements — check each platform's current upload guidance.</summary>
public sealed record ExportPreset(
    string Id,
    string Name,
    int Width,
    int Height,
    double Fps,
    string VideoCodec,
    int VideoBitrateKbps,
    string AudioCodec,
    int AudioBitrateKbps,
    string Container)
{
    public string AspectLabel
    {
        get
        {
            var g = Gcd(Width, Height);
            return g == 0 ? "?" : $"{Width / g}:{Height / g}";
        }
    }

    public bool IsVertical => Height > Width;

    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(Name)) errors.Add("name");
        if (Width is < 16 or > 8192 || Width % 2 != 0) errors.Add("width");
        if (Height is < 16 or > 8192 || Height % 2 != 0) errors.Add("height");
        if (Fps is <= 0 or > 120) errors.Add("fps");
        if (VideoBitrateKbps is <= 0 or > 400_000) errors.Add("videoBitrate");
        if (AudioBitrateKbps is <= 0 or > 1_536) errors.Add("audioBitrate");
        if (string.IsNullOrWhiteSpace(VideoCodec)) errors.Add("videoCodec");
        if (string.IsNullOrWhiteSpace(Container)) errors.Add("container");
        return errors;
    }

    private static int Gcd(int a, int b) { while (b != 0) (a, b) = (b, a % b); return Math.Abs(a); }
}

public static class ExportPresetCatalog
{
    /// <summary>Built-in defaults. The studio records vertical 9:16 at 25 fps by default.</summary>
    public static IReadOnlyList<ExportPreset> Defaults { get; } =
    [
        new("youtube-16x9", "YouTube 16:9", 1920, 1080, 25, "h264", 12_000, "aac", 320, "mp4"),
        new("reels-9x16", "Instagram Reels 9:16", 1080, 1920, 25, "h264", 10_000, "aac", 256, "mp4"),
        new("tiktok-9x16", "TikTok 9:16", 1080, 1920, 25, "h264", 10_000, "aac", 256, "mp4"),
        new("shorts-9x16", "YouTube Shorts 9:16", 1080, 1920, 25, "h264", 10_000, "aac", 256, "mp4"),
        new("master-4k", "4K Master (9:16)", 2160, 3840, 25, "h265", 60_000, "aac", 320, "mov"),
        new("master-1080p", "1080p Master (9:16)", 1080, 1920, 25, "h264", 20_000, "aac", 320, "mov"),
    ];
}

/// <summary>Stores the user's edited presets as JSON in the data folder.</summary>
public sealed class ExportPresetStore(AppPaths paths)
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    private string FilePath => Path.Combine(paths.Root, "export-presets.json");

    public IReadOnlyList<ExportPreset> Load()
    {
        try
        {
            if (File.Exists(FilePath))
            {
                var list = JsonSerializer.Deserialize<List<ExportPreset>>(File.ReadAllText(FilePath), Options);
                if (list is { Count: > 0 }) return list;
            }
        }
        catch (JsonException) { /* fall back to defaults; broken file kept for inspection */ }
        return ExportPresetCatalog.Defaults;
    }

    public void Save(IEnumerable<ExportPreset> presets)
    {
        var list = presets.ToList();
        var invalid = list.Where(p => p.Validate().Count > 0).Select(p => p.Name).ToList();
        if (invalid.Count > 0) throw new ArgumentException("Invalid presets: " + string.Join(", ", invalid));
        var tmp = FilePath + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(list, Options));
        File.Move(tmp, FilePath, overwrite: true);
    }

    public IReadOnlyList<ExportPreset> ResetToDefaults()
    {
        if (File.Exists(FilePath)) File.Delete(FilePath); // our own settings file, not user media
        return ExportPresetCatalog.Defaults;
    }
}
