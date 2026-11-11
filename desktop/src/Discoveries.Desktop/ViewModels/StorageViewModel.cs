using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Discoveries.Core;
using Discoveries.Core.Environment;
using Discoveries.Desktop.Services;

namespace Discoveries.Desktop.ViewModels;

public sealed record DriveRow(string Name, string Detail, double UsedPercent);

public sealed partial class StorageViewModel(LocalizationService loc, AppPaths paths) : ObservableObject, IPage
{
    public ObservableCollection<DriveRow> Drives { get; } = new();

    [ObservableProperty] private string _dataRoot = "";

    public Task OnShownAsync()
    {
        Refresh();
        return Task.CompletedTask;
    }

    [RelayCommand]
    private void Refresh()
    {
        DataRoot = loc.Format("Storage.DataRoot", paths.Root);
        Drives.Clear();
        foreach (var d in StorageScanner.Scan())
        {
            Drives.Add(new DriveRow(
                $"{d.Name}  {d.Label}  ({d.DriveType})",
                loc.Format("Dash.FreeOf", LocalizationService.Bytes(d.FreeBytes), LocalizationService.Bytes(d.TotalBytes)),
                Math.Round(100 - d.FreePercent, 1)));
        }
    }
}
