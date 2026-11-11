using CommunityToolkit.Mvvm.ComponentModel;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

/// <summary>Honest page for a section that is not built yet. Contains no action buttons.</summary>
public sealed partial class PlannedSectionViewModel : ObservableObject
{
    private readonly LocalizationService _loc;

    public PlannedSectionViewModel(SectionInfo section, LocalizationService loc)
    {
        Section = section;
        _loc = loc;
        _loc.LanguageChanged += (_, _) => OnPropertyChanged(string.Empty);
    }

    public SectionInfo Section { get; }
    public string Title => _loc[$"Nav.{Section.Id}"];
    public string Header => _loc.Format("Planned.Header", Section.Phase);
    public string Requirement => _loc[$"Req.{Section.Requirement}"];
}
