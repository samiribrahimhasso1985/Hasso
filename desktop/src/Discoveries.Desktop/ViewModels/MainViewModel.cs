using System.Collections.ObjectModel;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Messaging;
using Discoveries.Desktop.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Discoveries.Desktop.ViewModels;

public sealed record NavigateMessage(string SectionId, bool CreateNewEpisode = false);

public sealed partial class MainViewModel : ObservableObject, IRecipient<NavigateMessage>
{
    private readonly IServiceProvider _services;
    private readonly LocalizationService _loc;
    private readonly Dictionary<string, object> _pages = new();

    private readonly EngineManager _engine;
    private readonly Discoveries.Core.AppPaths _paths;
    private bool _engineOnline;

    public MainViewModel(IServiceProvider services, LocalizationService loc, EngineManager engine, Discoveries.Core.AppPaths paths)
    {
        _services = services;
        _loc = loc;
        _engine = engine;
        _paths = paths;
        NavItems = new ObservableCollection<NavItem>(SectionCatalog.All.Select(s => new NavItem(s, loc)));
        _loc.LanguageChanged += (_, _) =>
        {
            foreach (var n in NavItems) n.Refresh();
            OnPropertyChanged(nameof(FlowDirection));
            UpdateStatusBar();
        };
        UpdateStatusBar();
        var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromSeconds(10) };
        timer.Tick += async (_, _) => await RefreshEngineAsync();
        timer.Start();
        _ = RefreshEngineAsync();
        WeakReferenceMessenger.Default.Register(this);
        SelectedNav = NavItems[0];
    }

    public ObservableCollection<NavItem> NavItems { get; }

    public FlowDirection FlowDirection => _loc.FlowDirection;

    [ObservableProperty]
    private NavItem? _selectedNav;

    [ObservableProperty] private string _engineText = "";
    [ObservableProperty] private string _dataText = "";
    [ObservableProperty] private string _modeText = "";

    private async Task RefreshEngineAsync()
    {
        _engineOnline = (await _engine.CheckAsync()).Online;
        UpdateStatusBar();
    }

    private void UpdateStatusBar()
    {
        EngineText = _loc.Format("Bar.Engine", _engineOnline ? _loc["Bar.Online"] : _loc["Bar.Offline"]);
        DataText = _loc.Format("Bar.Data", _paths.Root);
        ModeText = _loc["Bar.Mode"];
    }

    [ObservableProperty]
    private object? _currentPage;

    partial void OnSelectedNavChanged(NavItem? value)
    {
        if (value is null) return;
        CurrentPage = PageFor(value.Section);
        if (CurrentPage is IPage page) _ = page.OnShownAsync();
    }

    private object PageFor(SectionInfo section)
    {
        if (_pages.TryGetValue(section.Id, out var existing)) return existing;
        object page = section.Id switch
        {
            "dashboard" => _services.GetRequiredService<DashboardViewModel>(),
            "episodes" => _services.GetRequiredService<EpisodeManagerViewModel>(),
            "storage" => _services.GetRequiredService<StorageViewModel>(),
            "settings" => _services.GetRequiredService<SettingsViewModel>(),
            "multiexport" => _services.GetRequiredService<MultiExportViewModel>(),
            _ => new PlannedSectionViewModel(section, _loc),
        };
        _pages[section.Id] = page;
        return page;
    }

    public void Navigate(string sectionId) =>
        SelectedNav = NavItems.First(n => n.Section.Id == sectionId);

    public void Receive(NavigateMessage message)
    {
        Navigate(message.SectionId);
        if (message.CreateNewEpisode && CurrentPage is EpisodeManagerViewModel ep)
            _ = ep.NewEpisodeCommand.ExecuteAsync(null);
    }
}

/// <summary>Pages that refresh their data whenever they are shown.</summary>
public interface IPage
{
    Task OnShownAsync();
}
