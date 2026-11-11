using Discoveries.Core.Domain;
using Discoveries.Core.Media;

namespace Discoveries.Core.Guard;

public enum IntegrityProblem { Missing, SizeChanged, HashMismatch }

public sealed record IntegrityIssue(Guid AssetId, string Path, IntegrityProblem Problem, string? Detail = null);

public sealed record IntegrityReport(int Checked, IReadOnlyList<IntegrityIssue> Issues)
{
    public bool Ok => Issues.Count == 0;
}

/// <summary>Read-only integrity checks for project media: missing files, changed size and,
/// optionally, SHA-256 against the hash recorded at import. Never repairs or deletes anything.</summary>
public static class ProjectGuard
{
    public static async Task<IntegrityReport> CheckMediaAsync(IEnumerable<MediaAsset> assets, bool verifyHashes,
        IProgress<int>? progress = null, CancellationToken ct = default)
    {
        var issues = new List<IntegrityIssue>();
        var n = 0;
        foreach (var a in assets)
        {
            ct.ThrowIfCancellationRequested();
            n++;
            progress?.Report(n);
            var info = new FileInfo(a.StoredPath);
            if (!info.Exists)
            {
                issues.Add(new(a.Id, a.StoredPath, IntegrityProblem.Missing));
                continue;
            }
            if (a.SizeBytes > 0 && info.Length != a.SizeBytes)
            {
                issues.Add(new(a.Id, a.StoredPath, IntegrityProblem.SizeChanged, $"{a.SizeBytes} → {info.Length}"));
                continue;
            }
            if (verifyHashes && !string.IsNullOrEmpty(a.Sha256))
            {
                var hash = await FileHasher.Sha256Async(a.StoredPath, ct);
                if (!string.Equals(hash, a.Sha256, StringComparison.OrdinalIgnoreCase))
                    issues.Add(new(a.Id, a.StoredPath, IntegrityProblem.HashMismatch));
            }
        }
        return new IntegrityReport(n, issues);
    }

    /// <summary>Checks the standard episode folder layout and reports missing sub-folders.</summary>
    public static IReadOnlyList<string> MissingEpisodeFolders(string episodeFolder) =>
        AppPaths.EpisodeSubfolders.Where(s => !Directory.Exists(Path.Combine(episodeFolder, s))).ToList();
}
