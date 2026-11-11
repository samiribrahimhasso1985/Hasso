using CommunityToolkit.Mvvm.ComponentModel;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

public enum Requirement { None, ApiKey, SonySdk, Resolve, Engine }

/// <summary>A sidebar section. <see cref="Built"/> = it has a working page; otherwise an honest
/// status page explains in which phase it is built and what it needs.</summary>
public sealed record SectionInfo(string Id, int Phase, bool Built, Requirement Requirement = Requirement.None);

public static class SectionCatalog
{
    // Phase numbers follow the development order of the master prompt (sections 44).
    public static readonly IReadOnlyList<SectionInfo> All =
    [
        new("dashboard", 4, true),
        new("episodes", 4, true),
        new("script", 5, false),
        new("story", 9, false, Requirement.ApiKey),
        new("director", 9, false, Requirement.ApiKey),
        new("storyboard", 9, false, Requirement.ApiKey),
        new("import", 7, false, Requirement.Engine),
        new("discovery", 9, false, Requirement.ApiKey),
        new("camera", 8, false, Requirement.SonySdk),
        new("multicam", 8, false, Requirement.SonySdk),
        new("live", 10, false, Requirement.SonySdk),
        new("camerasettings", 8, false, Requirement.SonySdk),
        new("lighting", 10, false),
        new("teleprompter", 10, false),
        new("editing", 11, false, Requirement.Engine),
        new("takes", 12, false, Requirement.Engine),
        new("continuity", 12, false, Requirement.Engine),
        new("shotquality", 12, false, Requirement.Engine),
        new("voice", 13, false, Requirement.Engine),
        new("music", 13, false, Requirement.ApiKey),
        new("sound", 13, false, Requirement.Engine),
        new("motion", 14, false),
        new("subtitles", 13, false, Requirement.Engine),
        new("thumbnail", 14, false, Requirement.ApiKey),
        new("virtualbg", 14, false, Requirement.Engine),
        new("color", 14, false, Requirement.Engine),
        new("final", 16, false, Requirement.Resolve),
        new("resolve", 15, false, Requirement.Resolve),
        new("identity", 14, false),
        new("storage", 17, true),
        new("archive", 17, false, Requirement.Engine),
        new("approvals", 18, false),
        new("export", 20, false, Requirement.Resolve),
        new("providers", 6, false, Requirement.ApiKey),
        new("settings", 3, true),
    ];
}

public sealed partial class NavItem(SectionInfo section, LocalizationService loc) : ObservableObject
{
    public SectionInfo Section { get; } = section;
    public string Title => loc[$"Nav.{Section.Id}"];
    public string Badge => Section.Built ? "" : $"P{Section.Phase}";
    public void Refresh() => OnPropertyChanged(nameof(Title));
}
