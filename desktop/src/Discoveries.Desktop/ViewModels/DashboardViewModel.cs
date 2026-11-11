using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using Discoveries.Core.Environment;
using Discoveries.Core.Settings;
using Discoveries.Data;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

public sealed record StatusLine(string Text, FeatureStatus Status);

public sealed partial class DashboardViewModel : ObservableObject, IPage
{
    private readonly EpisodeService _episodes;
    private readonly LocalizationService _loc;
    private readonly EngineManager _engine;
    private readonly SettingsStore _settings;
    private readonly AppLog _log;

    public DashboardViewModel(EpisodeService episodes, LocalizationService loc, EngineManager engine, SettingsStore settings, AppLog log)
    {
        _episodes = episodes;
        _loc = loc;
        _engine = engine;
        _settings = settings;
        _log = log;
        _loc.LanguageChanged += (_, _) => _ = RefreshAsync();
    }

    [ObservableProperty] private int _episodeCount;
    [ObservableProperty] private int _activeCount;
    [ObservableProperty] private int _archivedCount;
    [ObservableProperty] private int _pendingApprovals;
    [ObservableProperty] private string _lastProject = "";
    [ObservableProperty] private string _backupStatus = "";
    [ObservableProperty] private StatusLine? _camera;
    [ObservableProperty] private StatusLine? _resolve;
    [ObservableProperty] private StatusLine? _engineStatus;
    [ObservableProperty] private bool _isBusy;

    public ObservableCollection<string> Drives { get; } = new();
    public ObservableCollection<string> RecentImports { get; } = new();
    public ObservableCollection<string> RecentOperations { get; } = new();

    public Task OnShownAsync() => RefreshAsync();

    [RelayCommand]
    private async Task RefreshAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        try
        {
            var stats = await _episodes.GetStatsAsync();
            EpisodeCount = stats.Total;
            ActiveCount = stats.Active;
            ArchivedCount = stats.Archived;
            PendingApprovals = stats.PendingApprovals;
            LastProject = stats.LastUpdated is { } e
                ? $"{_loc.Format("Ep.Row", e.EpisodeNumber.ToString("000"))} — {e.Title}"
                : _loc["Common.None"];

            var settings = _settings.Load();
            BackupStatus = settings.LastBackupUtc is { } b
                ? _loc.Format("Dash.BackupLast", b.ToLocalTime().ToString("g", _loc.Culture))
                : _loc["Dash.BackupNever"];

            Drives.Clear();
            foreach (var d in StorageScanner.Scan())
                Drives.Add($"{d.Name}  {d.Label}  —  {_loc.Format("Dash.FreeOf", LocalizationService.Bytes(d.FreeBytes), LocalizationService.Bytes(d.TotalBytes))} ({d.FreePercent}%)");

            RecentImports.Clear();
            var imports = await _episodes.RecentImportsAsync();
            if (imports.Count == 0) RecentImports.Add(_loc["Dash.NoImports"]);
            foreach (var a in imports)
                RecentImports.Add($"{a.ImportedAtUtc.ToLocalTime():g}  {a.OriginalFileName}  ({LocalizationService.Bytes(a.SizeBytes)})");

            RecentOperations.Clear();
            foreach (var op in await _episodes.RecentOperationsAsync())
                RecentOperations.Add($"{op.AtUtc.ToLocalTime():g}  ·  {op.Message}");

            Camera = ToLine(SonySdkLocator.Detect(settings.SonySdkFolder));
            Resolve = ToLine(ResolveLocator.Detect());

            var health = await _engine.CheckAsync();
            EngineStatus = health.Online
                ? new StatusLine(_loc.Format("Status.EngineOnline", YesNo(health.Ffmpeg), YesNo(health.Ffprobe)), FeatureStatus.Supported)
                : new StatusLine(_loc["Status.EngineOffline"], FeatureStatus.NotAvailable);
        }
        catch (Exception ex)
        {
            _log.Error("Dashboard refresh failed", ex);
            EngineStatus = new StatusLine(_loc.Format("Common.Error", ex.Message), FeatureStatus.Error);
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void CreateEpisode() =>
        WeakReferenceMessenger.Default.Send(new NavigateMessage("episodes", CreateNewEpisode: true));

    private string YesNo(bool v) => v ? _loc["Status.Yes"] : _loc["Status.No"];

    private StatusLine ToLine(IntegrationStatus s) => new(_loc.Format(s.DetailKey, s.Detail), s.Status);
}
