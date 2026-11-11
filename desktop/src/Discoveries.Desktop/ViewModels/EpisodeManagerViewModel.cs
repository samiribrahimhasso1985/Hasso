using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Discoveries.Core.Domain;
using Discoveries.Core.Script;
using Discoveries.Core.Settings;
using Discoveries.Data;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

public sealed record EpisodeRow(Guid Id, string Header, string Title, string Status, bool IsArchived);

public sealed record SceneRow(string Header, string Detail, string Text);

public sealed record OptionItem(string Value, string Label);

public sealed partial class EpisodeManagerViewModel : ObservableObject, IPage
{
    private readonly EpisodeService _service;
    private readonly LocalizationService _loc;
    private readonly SettingsStore _settings;
    private readonly AppLog _log;

    public EpisodeManagerViewModel(EpisodeService service, LocalizationService loc, SettingsStore settings, AppLog log)
    {
        _service = service;
        _loc = loc;
        _settings = settings;
        _log = log;
        foreach (var l in LocalizationService.Languages) ContentLanguages.Add(new OptionItem(l.Code, l.NativeName));
        BuildOptions();
        _loc.LanguageChanged += (_, _) =>
        {
            var status = EditStatus;
            BuildOptions();
            EditStatus = status;
            _ = LoadAsync();
            _ = RefreshScenesAsync();
        };
    }

    public ObservableCollection<EpisodeRow> Episodes { get; } = new();
    public ObservableCollection<SceneRow> Scenes { get; } = new();
    public ObservableCollection<OptionItem> ContentLanguages { get; } = new();
    public ObservableCollection<OptionItem> Statuses { get; } = new();

    [ObservableProperty] private string _searchText = "";
    [ObservableProperty] private bool _showArchived;
    [ObservableProperty] private EpisodeRow? _selectedRow;
    [ObservableProperty] private bool _hasSelection;
    [ObservableProperty] private bool _selectedIsArchived;
    [ObservableProperty] private string _editTitle = "";
    [ObservableProperty] private string _editDescription = "";
    [ObservableProperty] private string _editLanguage = "ar";
    [ObservableProperty] private string _editStatus = nameof(EpisodeStatus.Draft);
    [ObservableProperty] private string _editDurationMinutes = "";
    [ObservableProperty] private string _editScript = "";
    [ObservableProperty] private string _breakdown = "";
    [ObservableProperty] private string _message = "";
    [ObservableProperty] private string _countText = "";
    private string? _projectFolder;

    public Task OnShownAsync() => LoadAsync();

    partial void OnShowArchivedChanged(bool value) => _ = LoadAsync();
    partial void OnSearchTextChanged(string value) => _ = LoadAsync();
    private bool _refreshingList;
    private Guid? _loadedId;

    partial void OnSelectedRowChanged(EpisodeRow? value)
    {
        if (_refreshingList) return;
        if (value is null) { ClearEditor(); return; }
        if (value.Id != _loadedId) _ = ReloadSelectedAsync();
    }

    private void BuildOptions()
    {
        Statuses.Clear();
        foreach (var s in new[] { EpisodeStatus.Draft, EpisodeStatus.Active, EpisodeStatus.InReview, EpisodeStatus.Completed })
            Statuses.Add(new OptionItem(s.ToString(), _loc[$"EpStatus.{s}"]));
    }

    private async Task LoadAsync(Guid? select = null)
    {
        try
        {
            var keep = select ?? _loadedId;
            var list = await _service.ListAsync(SearchText, ShowArchived);
            _refreshingList = true;
            try
            {
                Episodes.Clear();
                foreach (var e in list)
                    Episodes.Add(new EpisodeRow(e.Id, _loc.Format("Ep.Row", e.EpisodeNumber.ToString("000")), e.Title,
                        _loc[$"EpStatus.{e.Status}"], e.Status == EpisodeStatus.Archived));
                CountText = _loc.Format("Ep.Count", list.Count);
                SelectedRow = Episodes.FirstOrDefault(r => r.Id == keep);
            }
            finally { _refreshingList = false; }

            // Keep unsaved edits when the same episode stays selected; reload when it changed.
            if (SelectedRow is null) ClearEditor();
            else if (SelectedRow.Id != _loadedId || select is not null) await ReloadSelectedAsync();
        }
        catch (Exception ex) { Fail(ex); }
    }

    private void ClearEditor()
    {
        _loadedId = null;
        HasSelection = false;
        Scenes.Clear();
        Breakdown = "";
    }

    private async Task ReloadSelectedAsync()
    {
        if (SelectedRow is null) { ClearEditor(); return; }
        var e = await _service.GetAsync(SelectedRow.Id);
        if (e is null) { ClearEditor(); return; }
        _loadedId = e.Id;
        HasSelection = true;
        EditTitle = e.Title;
        EditDescription = e.Description;
        EditLanguage = e.Language;
        EditStatus = e.Status == EpisodeStatus.Archived ? (e.StatusBeforeArchive ?? EpisodeStatus.Draft).ToString() : e.Status.ToString();
        EditDurationMinutes = e.TargetDurationSeconds is { } s ? (s / 60.0).ToString("0.#", _loc.Culture) : "";
        EditScript = e.ScriptText;
        SelectedIsArchived = e.Status == EpisodeStatus.Archived;
        _projectFolder = e.ProjectFolder;
        ShowScenes(e.Scenes);
    }

    private async Task RefreshScenesAsync()
    {
        if (_loadedId is not { } id) return;
        var e = await _service.GetAsync(id);
        if (e is not null) ShowScenes(e.Scenes);
    }

    private void ShowScenes(IEnumerable<Scene> scenes)
    {
        Scenes.Clear();
        var list = scenes.OrderBy(s => s.Number).ToList();
        foreach (var s in list)
        {
            Scenes.Add(new SceneRow(
                $"{s.Number}. {_loc[$"Section.{s.Section}"]}",
                _loc.Format("Ep.ShotsSec", s.Shots.Count, _loc.Duration(s.EstimatedSeconds)),
                s.Text.Length > 220 ? s.Text[..220] + "…" : s.Text));
        }
        Breakdown = list.Count == 0 ? "" :
            _loc.Format("Ep.Breakdown", list.Count, list.Sum(s => s.Shots.Count), _loc.Duration(list.Sum(s => s.EstimatedSeconds)));
    }

    [RelayCommand]
    private async Task NewEpisodeAsync()
    {
        try
        {
            var e = await _service.CreateAsync("", _loc.Current);
            Message = _loc.Format("Ep.Created", e.EpisodeNumber.ToString("000"));
            SearchText = "";
            await LoadAsync(e.Id);
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private async Task SaveAsync()
    {
        if (SelectedRow is null) return;
        try
        {
            int? seconds = double.TryParse(EditDurationMinutes, System.Globalization.NumberStyles.Float, _loc.Culture, out var m)
                           || double.TryParse(EditDurationMinutes, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out m)
                ? (int)Math.Round(m * 60) : null;
            var status = Enum.TryParse<EpisodeStatus>(EditStatus, out var st) ? st : (EpisodeStatus?)null;
            await _service.UpdateAsync(SelectedRow.Id, EditTitle, EditDescription, EditLanguage, seconds, EditScript,
                SelectedIsArchived ? null : status);
            Message = _loc["Ep.Saved"];
            await LoadAsync();
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private async Task AnalyzeAsync()
    {
        if (SelectedRow is null) return;
        await SaveAsync();
        try
        {
            var pace = _settings.Load().NarrationWordsPerMinute;
            await _service.AnalyzeScriptAsync(SelectedRow.Id, new ScriptParser(pace > 0 ? pace : ScriptParser.DefaultWordsPerMinute));
            var e = await _service.GetAsync(SelectedRow.Id);
            if (e is not null) ShowScenes(e.Scenes);
            Message = Breakdown;
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private async Task DuplicateAsync()
    {
        if (SelectedRow is null) return;
        try
        {
            var copy = await _service.DuplicateAsync(SelectedRow.Id, _loc["Ep.CopySuffix"]);
            Message = _loc.Format("Ep.Duplicated", copy.EpisodeNumber.ToString("000"));
            await LoadAsync(copy.Id);
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private async Task ArchiveAsync()
    {
        if (SelectedRow is null) return;
        try
        {
            await _service.ArchiveAsync(SelectedRow.Id);
            Message = _loc["Ep.ArchivedMsg"];
            await LoadAsync();
            await ReloadSelectedAsync();
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private async Task RestoreAsync()
    {
        if (SelectedRow is null) return;
        try
        {
            var id = SelectedRow.Id;
            await _service.RestoreAsync(id);
            Message = _loc["Ep.RestoredMsg"];
            await LoadAsync(id);
            await ReloadSelectedAsync();
        }
        catch (Exception ex) { Fail(ex); }
    }

    /// <summary>Deletes the database record only, after an explicit Yes. Files stay on disk.</summary>
    [RelayCommand]
    private async Task DeleteRecordAsync()
    {
        if (SelectedRow is null) return;
        var answer = System.Windows.MessageBox.Show(
            _loc.Format("Ep.DeleteConfirm", SelectedRow.Header, _projectFolder ?? "-"),
            _loc["Ep.DeleteRecord"], System.Windows.MessageBoxButton.YesNo, System.Windows.MessageBoxImage.Warning,
            System.Windows.MessageBoxResult.No);
        if (answer != System.Windows.MessageBoxResult.Yes) return;
        try
        {
            await _service.DeleteRecordAsync(SelectedRow.Id);
            Message = _loc["Ep.DeletedMsg"];
            _loadedId = null;
            await LoadAsync();
        }
        catch (Exception ex) { Fail(ex); }
    }

    [RelayCommand]
    private void OpenFolder()
    {
        if (_projectFolder is null) return;
        Directory.CreateDirectory(_projectFolder);
        Process.Start(new ProcessStartInfo("explorer.exe", $"\"{_projectFolder}\"") { UseShellExecute = true });
    }

    private void Fail(Exception ex)
    {
        _log.Error("Episode manager", ex);
        Message = _loc.Format("Common.Error", ex.Message);
    }
}
