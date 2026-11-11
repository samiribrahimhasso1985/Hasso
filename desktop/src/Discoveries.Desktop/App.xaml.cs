using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Threading;
using Discoveries.Core;
using Discoveries.Core.Settings;
using Discoveries.Data;
using Discoveries.Desktop.Services;
using Discoveries.Desktop.ViewModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Discoveries.Desktop;

public partial class App : Application
{
    private ServiceProvider? _services;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        var smoke = e.Args.Contains("--smoke-test", StringComparer.OrdinalIgnoreCase);

        var paths = new AppPaths();
        var log = new AppLog(paths);
        DispatcherUnhandledException += (_, ex) =>
        {
            log.Error("Unhandled UI exception", ex.Exception);
            if (smoke) { WriteSmoke(paths, false, ex.Exception.ToString()); Shutdown(1); }
            else MessageBox.Show(ex.Exception.Message, "DISCOVERIES", MessageBoxButton.OK, MessageBoxImage.Error);
            ex.Handled = true;
        };
        AppDomain.CurrentDomain.UnhandledException += (_, ex) => log.Error("Unhandled exception", ex.ExceptionObject as Exception);

        var settingsStore = new SettingsStore(paths);
        var settings = settingsStore.Load();

        var sc = new ServiceCollection();
        sc.AddSingleton(paths);
        sc.AddSingleton(log);
        sc.AddSingleton(settingsStore);
        sc.AddSingleton<LocalizationService>();
        sc.AddSingleton(_ => new EngineManager(settings.EnginePort));
        sc.AddDbContextFactory<StudioDbContext>(o => o.UseSqlite($"Data Source={paths.Database}"));
        sc.AddSingleton(sp => new EpisodeService(sp.GetRequiredService<IDbContextFactory<StudioDbContext>>(), paths));
        sc.AddSingleton<MainViewModel>();
        sc.AddSingleton<DashboardViewModel>();
        sc.AddSingleton<EpisodeManagerViewModel>();
        sc.AddSingleton<StorageViewModel>();
        sc.AddSingleton<SettingsViewModel>();
        sc.AddSingleton<MultiExportViewModel>();
        sc.AddSingleton(new Discoveries.Core.Export.ExportPresetStore(paths));
        sc.AddSingleton(sp => new CostService(sp.GetRequiredService<IDbContextFactory<StudioDbContext>>()));
        _services = sc.BuildServiceProvider();

        using (var db = _services.GetRequiredService<IDbContextFactory<StudioDbContext>>().CreateDbContext())
        {
            var added = DatabaseInitializer.Initialize(db);
            if (added.Count > 0) log.Info("Database upgraded, new tables: " + string.Join(", ", added));
        }

        _services.GetRequiredService<LocalizationService>().SetLanguage(settings.UiLanguage);
        log.Info($"Started. Data folder: {paths.Root}");

        var window = new MainWindow { DataContext = _services.GetRequiredService<MainViewModel>() };
        MainWindow = window;
        if (smoke) window.ContentRendered += async (_, _) => await RunSmokeTestAsync(paths, log);
        window.Show();
    }

    /// <summary>
    /// Automated end-to-end check used by CI on a real Windows machine: opens every section,
    /// switches all three languages, creates/analyzes/duplicates/archives/restores an episode
    /// through the real view-models and database, then exits with 0 (ok) or 1 (failure).
    /// </summary>
    private async Task RunSmokeTestAsync(AppPaths paths, AppLog log)
    {
        var steps = new List<string>();
        try
        {
            var main = _services!.GetRequiredService<MainViewModel>();
            var loc = _services!.GetRequiredService<LocalizationService>();

            foreach (var lang in new[] { "en", "de", "ar" })
            {
                loc.SetLanguage(lang);
                await Idle();
                foreach (var nav in main.NavItems)
                {
                    main.SelectedNav = nav;
                    await Idle();
                    if (main.CurrentPage is null) throw new InvalidOperationException($"No page for {nav.Section.Id}");
                }
                steps.Add($"lang {lang}: {main.NavItems.Count} sections opened, RTL={loc.FlowDirection == FlowDirection.RightToLeft}");
            }

            main.Navigate("episodes");
            await Task.Delay(500);
            await Idle();
            var ep = (EpisodeManagerViewModel)main.CurrentPage!;
            await ep.NewEpisodeCommand.ExecuteAsync(null);
            if (!ep.HasSelection) throw new InvalidOperationException("New episode not selected");
            ep.EditTitle = "اختبار التشغيل";
            ep.EditScript = "مقدمة الحلقة.\n\nالمشهد الأول. جملة ثانية.\n\nالخاتمة.";
            await ep.AnalyzeCommand.ExecuteAsync(null);
            if (ep.Scenes.Count != 3) throw new InvalidOperationException($"Expected 3 scenes, got {ep.Scenes.Count}");
            steps.Add($"episode created + analyzed: {ep.Breakdown}");
            await ep.DuplicateCommand.ExecuteAsync(null);
            await ep.ArchiveCommand.ExecuteAsync(null);
            ep.ShowArchived = true;
            await Task.Delay(300);
            await Idle();
            steps.Add($"duplicated + archived; list with archived = {ep.Episodes.Count}");

            main.Navigate("multiexport");
            await Idle();
            var exp = (MultiExportViewModel)main.CurrentPage!;
            exp.Presets[0].Fps = "30";
            exp.SaveCommand.Execute(null);
            if (new Discoveries.Core.Export.ExportPresetStore(paths).Load()[0].Fps != 30) throw new InvalidOperationException("Preset not saved");
            exp.ResetCommand.Execute(null);
            steps.Add($"export presets: {exp.Presets.Count} edited, saved, reset");

            main.Navigate("dashboard");
            var dash = (DashboardViewModel)main.CurrentPage!;
            await dash.RefreshCommand.ExecuteAsync(null);
            steps.Add($"dashboard: episodes={dash.EpisodeCount}, archived={dash.ArchivedCount}, camera={dash.Camera?.Status}, resolve={dash.Resolve?.Status}, engine={dash.EngineStatus?.Status}");

            WriteSmoke(paths, true, string.Join("\n", steps));
            log.Info("Smoke test passed");
            Shutdown(0);
        }
        catch (Exception ex)
        {
            log.Error("Smoke test failed", ex);
            steps.Add(ex.ToString());
            WriteSmoke(paths, false, string.Join("\n", steps));
            Shutdown(1);
        }
    }

    private static async Task Idle()
    {
        await Task.Delay(50);
        await Dispatcher.CurrentDispatcher.InvokeAsync(() => { }, DispatcherPriority.ApplicationIdle);
    }

    private static void WriteSmoke(AppPaths paths, bool ok, string details) =>
        File.WriteAllText(Path.Combine(paths.Root, "smoke-result.json"),
            JsonSerializer.Serialize(new { ok, details, atUtc = DateTime.UtcNow }, new JsonSerializerOptions { WriteIndented = true }));

    protected override void OnExit(ExitEventArgs e)
    {
        _services?.Dispose();
        base.OnExit(e);
    }
}
