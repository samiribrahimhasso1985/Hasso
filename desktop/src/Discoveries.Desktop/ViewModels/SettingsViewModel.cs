using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Reflection;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Discoveries.Core;
using Discoveries.Core.Settings;
using Discoveries.Desktop.Services;
using Microsoft.Data.Sqlite;

namespace Discoveries.Desktop.ViewModels;

public sealed partial class SettingsViewModel : ObservableObject, IPage
{
    private readonly LocalizationService _loc;
    private readonly SettingsStore _store;
    private readonly AppPaths _paths;
    private readonly EngineManager _engine;
    private readonly AppLog _log;
    private bool _loading;

    public SettingsViewModel(LocalizationService loc, SettingsStore store, AppPaths paths, EngineManager engine, AppLog log)
    {
        _loc = loc;
        _store = store;
        _paths = paths;
        _engine = engine;
        _log = log;
        Load();
    }

    public IReadOnlyList<LanguageOption> Languages => LocalizationService.Languages;
    public string DataFolder => _paths.Root;
    public string Version => _loc.Format("Settings.Version",
        Assembly.GetExecutingAssembly().GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion?.Split('+')[0] ?? "?");

    [ObservableProperty] private LanguageOption? _selectedLanguage;
    [ObservableProperty] private string _sonySdkFolder = "";
    [ObservableProperty] private string _pace = "";
    [ObservableProperty] private string _engineMessage = "";
    [ObservableProperty] private string _message = "";

    public Task OnShownAsync() => CheckEngineAsync();

    private void Load()
    {
        _loading = true;
        var s = _store.Load();
        SelectedLanguage = Languages.FirstOrDefault(l => l.Code == _loc.Current) ?? Languages[0];
        SonySdkFolder = s.SonySdkFolder ?? "";
        Pace = s.NarrationWordsPerMinute.ToString(CultureInfo.InvariantCulture);
        _loading = false;
    }

    partial void OnSelectedLanguageChanged(LanguageOption? value)
    {
        if (_loading || value is null || value.Code == _loc.Current) return;
        _loc.SetLanguage(value.Code);
        var s = _store.Load();
        s.UiLanguage = value.Code;
        _store.Save(s);
        OnPropertyChanged(nameof(Version));
    }

    [RelayCommand]
    private void ChooseSdkFolder()
    {
        var dlg = new Microsoft.Win32.OpenFolderDialog();
        if (dlg.ShowDialog() == true) SonySdkFolder = dlg.FolderName;
    }

    [RelayCommand]
    private void Save()
    {
        var s = _store.Load();
        s.SonySdkFolder = string.IsNullOrWhiteSpace(SonySdkFolder) ? null : SonySdkFolder.Trim();
        if (double.TryParse(Pace, NumberStyles.Float, CultureInfo.InvariantCulture, out var p) && p is >= 40 and <= 300)
            s.NarrationWordsPerMinute = p;
        _store.Save(s);
        Message = _loc["Settings.Saved"];
    }

    [RelayCommand]
    private void OpenDataFolder() =>
        Process.Start(new ProcessStartInfo("explorer.exe", $"\"{_paths.Root}\"") { UseShellExecute = true });

    /// <summary>Consistent online copy of the SQLite database (SQLite backup API).</summary>
    [RelayCommand]
    private void Backup()
    {
        try
        {
            var target = Path.Combine(_paths.Backups, $"studio-{DateTime.Now:yyyyMMdd-HHmmss}.db");
            using (var src = new SqliteConnection($"Data Source={_paths.Database}"))
            using (var dst = new SqliteConnection($"Data Source={target}"))
            {
                src.Open();
                dst.Open();
                src.BackupDatabase(dst);
            }
            SqliteConnection.ClearAllPools();
            var s = _store.Load();
            s.LastBackupUtc = DateTime.UtcNow;
            _store.Save(s);
            Message = _loc.Format("Settings.BackupDone", target);
            _log.Info($"Database backup created: {target}");
        }
        catch (Exception ex)
        {
            _log.Error("Backup failed", ex);
            Message = _loc.Format("Common.Error", ex.Message);
        }
    }

    [RelayCommand]
    private async Task StartEngineAsync()
    {
        var result = await _engine.StartAsync();
        EngineMessage = result switch
        {
            EngineStartResult.Started or EngineStartResult.AlreadyRunning => _loc["Status.EngineStarted"],
            EngineStartResult.EngineFilesMissing => _loc["Status.EngineMissing"],
            _ => _loc.Format("Status.PythonMissing", Path.Combine(_engine.EngineFolder, "requirements.txt")),
        };
        if (result is EngineStartResult.Started or EngineStartResult.AlreadyRunning) await CheckEngineAsync();
    }

    [RelayCommand]
    private async Task CheckEngineAsync()
    {
        var h = await _engine.CheckAsync();
        EngineMessage = h.Online
            ? _loc.Format("Status.EngineOnline", h.Ffmpeg ? _loc["Status.Yes"] : _loc["Status.No"], h.Ffprobe ? _loc["Status.Yes"] : _loc["Status.No"])
            : _loc["Status.EngineOffline"];
    }
}
