using System.Collections.ObjectModel;
using System.Globalization;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Discoveries.Core.Export;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

/// <summary>Editable row for one export preset (text fields so the user can type freely).</summary>
public sealed partial class PresetRow : ObservableObject
{
    public PresetRow(ExportPreset p)
    {
        Id = p.Id; _name = p.Name; _width = p.Width.ToString(); _height = p.Height.ToString();
        _fps = p.Fps.ToString(CultureInfo.InvariantCulture); _videoCodec = p.VideoCodec;
        _videoBitrate = p.VideoBitrateKbps.ToString(); _audioCodec = p.AudioCodec;
        _audioBitrate = p.AudioBitrateKbps.ToString(); _container = p.Container;
    }

    public string Id { get; }
    [ObservableProperty] private string _name;
    [ObservableProperty] private string _width;
    [ObservableProperty] private string _height;
    [ObservableProperty] private string _fps;
    [ObservableProperty] private string _videoCodec;
    [ObservableProperty] private string _videoBitrate;
    [ObservableProperty] private string _audioCodec;
    [ObservableProperty] private string _audioBitrate;
    [ObservableProperty] private string _container;

    public ExportPreset? ToPreset()
    {
        static int I(string s) => int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : -1;
        var fps = double.TryParse(Fps.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var f) ? f : -1;
        var p = new ExportPreset(Id, Name.Trim(), I(Width), I(Height), fps, VideoCodec.Trim(), I(VideoBitrate),
            AudioCodec.Trim(), I(AudioBitrate), Container.Trim());
        return p.Validate().Count == 0 ? p : null;
    }
}

public sealed partial class MultiExportViewModel : ObservableObject, IPage
{
    private readonly ExportPresetStore _store;
    private readonly LocalizationService _loc;
    private readonly AppLog _log;

    public MultiExportViewModel(ExportPresetStore store, LocalizationService loc, AppLog log)
    {
        _store = store; _loc = loc; _log = log;
        Fill(_store.Load());
    }

    public ObservableCollection<PresetRow> Presets { get; } = new();
    [ObservableProperty] private string _message = "";

    public Task OnShownAsync() => Task.CompletedTask;

    private void Fill(IEnumerable<ExportPreset> presets)
    {
        Presets.Clear();
        foreach (var p in presets) Presets.Add(new PresetRow(p));
    }

    [RelayCommand]
    private void Save()
    {
        var parsed = Presets.Select(r => (r, p: r.ToPreset())).ToList();
        var invalid = parsed.Where(x => x.p is null).Select(x => x.r.Name).ToList();
        if (invalid.Count > 0) { Message = _loc.Format("Exp.Invalid", string.Join(", ", invalid)); return; }
        try
        {
            _store.Save(parsed.Select(x => x.p!));
            Message = _loc["Exp.Saved"];
            _log.Info("Export presets saved");
        }
        catch (Exception ex) { Message = _loc.Format("Common.Error", ex.Message); }
    }

    [RelayCommand]
    private void Reset()
    {
        Fill(_store.ResetToDefaults());
        Message = _loc["Exp.Saved"];
    }
}
