namespace Discoveries.Core;

/// <summary>Locations of local data. Override the root with DISCOVERIES_DATA_DIR (used by tests/CI).</summary>
public sealed class AppPaths
{
    public AppPaths(string? root = null)
    {
        Root = root
            ?? System.Environment.GetEnvironmentVariable("DISCOVERIES_DATA_DIR")
            ?? Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData), "DiscoveriesStudio");
        Directory.CreateDirectory(Root);
        Directory.CreateDirectory(Logs);
        Directory.CreateDirectory(Projects);
        Directory.CreateDirectory(Backups);
    }

    public string Root { get; }
    public string Database => Path.Combine(Root, "studio.db");
    public string Settings => Path.Combine(Root, "settings.json");
    public string Logs => Path.Combine(Root, "logs");
    public string Projects => Path.Combine(Root, "Projects");
    public string Backups => Path.Combine(Root, "Backups");

    public string EpisodeFolder(int episodeNumber) => Path.Combine(Projects, $"Episode_{episodeNumber:000}");

    /// <summary>Standard sub-folders of an episode project.</summary>
    public static readonly string[] EpisodeSubfolders =
    [
        "Script", "Storyboard", "Camera_Originals", "Audio", "Images", "Backgrounds", "BRoll",
        "Music", "Sound_Effects", "Subtitles", "Proxies", "Resolve_Project", "Exports", "Reports",
    ];
}
