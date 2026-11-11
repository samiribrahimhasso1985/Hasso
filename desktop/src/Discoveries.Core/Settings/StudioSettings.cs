using System.Text.Json;

namespace Discoveries.Core.Settings;

public sealed class StudioSettings
{
    public string UiLanguage { get; set; } = "ar";
    public string? SonySdkFolder { get; set; }
    public int EnginePort { get; set; } = 8765;
    public double NarrationWordsPerMinute { get; set; } = 130;
    public DateTime? LastBackupUtc { get; set; }
}

public sealed class SettingsStore(AppPaths paths)
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public StudioSettings Load()
    {
        try
        {
            if (File.Exists(paths.Settings))
                return JsonSerializer.Deserialize<StudioSettings>(File.ReadAllText(paths.Settings), Options) ?? new();
        }
        catch (JsonException) { /* corrupt file → defaults, file kept for inspection */ }
        return new StudioSettings();
    }

    public void Save(StudioSettings settings)
    {
        var tmp = paths.Settings + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(settings, Options));
        File.Move(tmp, paths.Settings, overwrite: true);
    }
}
