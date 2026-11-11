using System.Globalization;
using System.Windows;

namespace Discoveries.Desktop.Services;

public sealed record LanguageOption(string Code, string NativeName);

/// <summary>Swaps the string dictionary at runtime: every {DynamicResource} label updates
/// immediately, no restart. Arabic switches the window to right-to-left.</summary>
public sealed class LocalizationService
{
    public static readonly IReadOnlyList<LanguageOption> Languages =
    [
        new("ar", "العربية"),
        new("de", "Deutsch"),
        new("en", "English"),
    ];

    private ResourceDictionary? _current;

    public string Current { get; private set; } = "ar";
    public FlowDirection FlowDirection => Current == "ar" ? FlowDirection.RightToLeft : FlowDirection.LeftToRight;
    public CultureInfo Culture => CultureInfo.GetCultureInfo(Current);

    public event EventHandler? LanguageChanged;

    public void SetLanguage(string code)
    {
        if (Languages.All(l => l.Code != code)) code = "ar";
        var dict = new ResourceDictionary
        {
            Source = new Uri($"pack://application:,,,/Discoveries.Desktop;component/Localization/Strings.{code}.xaml", UriKind.Absolute),
        };
        var merged = Application.Current.Resources.MergedDictionaries;
        if (_current is not null) merged.Remove(_current);
        merged.Add(dict);
        _current = dict;
        Current = code;
        CultureInfo.CurrentUICulture = Culture;
        LanguageChanged?.Invoke(this, EventArgs.Empty);
    }

    public string this[string key] =>
        Application.Current.TryFindResource(key) as string ?? key;

    public string Format(string key, params object?[] args) =>
        string.Format(Culture, this[key], args);

    public string Duration(double seconds)
    {
        var t = TimeSpan.FromSeconds(Math.Round(seconds));
        return t.TotalHours >= 1 ? t.ToString(@"h\:mm\:ss", CultureInfo.InvariantCulture) : t.ToString(@"m\:ss", CultureInfo.InvariantCulture);
    }

    public static string Bytes(long bytes)
    {
        string[] units = ["B", "KB", "MB", "GB", "TB"];
        double v = bytes;
        var i = 0;
        while (v >= 1024 && i < units.Length - 1) { v /= 1024; i++; }
        return $"{v:0.#} {units[i]}";
    }
}
