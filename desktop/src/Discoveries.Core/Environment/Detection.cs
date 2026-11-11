namespace Discoveries.Core.Environment;

/// <summary>Status values for any camera feature or external integration.</summary>
public enum FeatureStatus { Supported, ReadOnly, Unsupported, NotAvailable, Busy, Error }

public sealed record IntegrationStatus(FeatureStatus Status, string DetailKey, string? Detail = null);

public sealed record DriveSnapshot(string Name, string? Label, string DriveType, long TotalBytes, long FreeBytes)
{
    public double FreePercent => TotalBytes <= 0 ? 0 : Math.Round(FreeBytes * 100.0 / TotalBytes, 1);
}

public static class StorageScanner
{
    public static IReadOnlyList<DriveSnapshot> Scan()
    {
        var list = new List<DriveSnapshot>();
        foreach (var d in DriveInfo.GetDrives())
        {
            try
            {
                if (!d.IsReady) continue;
                if (d.TotalSize <= 0) continue;
                list.Add(new DriveSnapshot(d.Name, string.IsNullOrWhiteSpace(d.VolumeLabel) ? null : d.VolumeLabel,
                    d.DriveType.ToString(), d.TotalSize, d.AvailableFreeSpace));
            }
            catch (IOException) { /* drive disappeared */ }
            catch (UnauthorizedAccessException) { }
        }
        return list;
    }
}

/// <summary>
/// Detects whether the official Sony Camera Remote SDK is present. The SDK is not shipped with
/// this software (Sony licence); the user downloads it and points the app at its folder.
/// Without the SDK no camera function is offered — nothing is simulated.
/// </summary>
public static class SonySdkLocator
{
    public static readonly string[] RequiredFiles = ["Cr_Core.dll"];

    public static IntegrationStatus Detect(string? sdkFolder)
    {
        if (string.IsNullOrWhiteSpace(sdkFolder))
            return new IntegrationStatus(FeatureStatus.NotAvailable, "Status.SonySdkNotConfigured");
        if (!Directory.Exists(sdkFolder))
            return new IntegrationStatus(FeatureStatus.NotAvailable, "Status.SonySdkFolderMissing", sdkFolder);
        var missing = RequiredFiles.Where(f => !File.Exists(Path.Combine(sdkFolder, f))).ToArray();
        return missing.Length == 0
            ? new IntegrationStatus(FeatureStatus.ReadOnly, "Status.SonySdkFound", sdkFolder)
            : new IntegrationStatus(FeatureStatus.NotAvailable, "Status.SonySdkFilesMissing", string.Join(", ", missing));
    }
}

/// <summary>Finds a local DaVinci Resolve installation and its scripting folder.</summary>
public static class ResolveLocator
{
    public static IReadOnlyList<string> DefaultExecutableCandidates =>
    [
        @"C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe",
    ];

    public static IReadOnlyList<string> DefaultScriptingCandidates =>
    [
        @"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting",
    ];

    public static IntegrationStatus Detect(IEnumerable<string>? exeCandidates = null, IEnumerable<string>? scriptingCandidates = null)
    {
        var exe = (exeCandidates ?? DefaultExecutableCandidates).FirstOrDefault(File.Exists);
        if (exe is null)
            return new IntegrationStatus(FeatureStatus.NotAvailable, "Status.ResolveNotFound");
        var scripting = (scriptingCandidates ?? DefaultScriptingCandidates).FirstOrDefault(Directory.Exists);
        var version = TryVersion(exe);
        return scripting is null
            ? new IntegrationStatus(FeatureStatus.ReadOnly, "Status.ResolveNoScripting", version)
            : new IntegrationStatus(FeatureStatus.Supported, "Status.ResolveFound", version);
    }

    private static string? TryVersion(string exe)
    {
        try
        {
            var v = System.Diagnostics.FileVersionInfo.GetVersionInfo(exe);
            return string.IsNullOrWhiteSpace(v.ProductVersion) ? null : v.ProductVersion;
        }
        catch { return null; }
    }
}
