using System.Security.Cryptography;

namespace Discoveries.Core.Media;

public static class FileHasher
{
    public static async Task<string> Sha256Async(string path, CancellationToken ct = default)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 1 << 20, useAsync: true);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return Convert.ToHexStringLower(hash);
    }
}

public sealed record ImportResult(
    string OriginalPath,
    string OriginalFileName,
    string StoredPath,
    string Sha256,
    long SizeBytes,
    DateTime OriginalLastWriteUtc);

public sealed class ImportVerificationException(string message) : IOException(message);

/// <summary>
/// Copies an original file into a project folder without ever touching the source:
/// the source is opened read-only, the copy never overwrites an existing file, timestamps are
/// preserved, and the copy is verified against the source SHA-256 before it is accepted.
/// </summary>
public sealed class MediaImporter
{
    public async Task<ImportResult> ImportAsync(string sourcePath, string destinationFolder, CancellationToken ct = default)
    {
        var source = new FileInfo(sourcePath);
        if (!source.Exists) throw new FileNotFoundException("Source file not found.", sourcePath);
        Directory.CreateDirectory(destinationFolder);

        var sourceHash = await FileHasher.Sha256Async(source.FullName, ct);
        var target = UniqueTargetPath(destinationFolder, source.Name);

        try
        {
            await using (var input = new FileStream(source.FullName, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20, true))
            await using (var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1 << 20, true))
            {
                await input.CopyToAsync(output, ct);
            }
            File.SetLastWriteTimeUtc(target, source.LastWriteTimeUtc);
            File.SetCreationTimeUtc(target, source.CreationTimeUtc);

            var copyHash = await FileHasher.Sha256Async(target, ct);
            if (!string.Equals(sourceHash, copyHash, StringComparison.Ordinal))
                throw new ImportVerificationException($"SHA-256 mismatch after copying {source.Name}.");
        }
        catch
        {
            // Remove only our own incomplete copy — never the source.
            if (File.Exists(target)) File.Delete(target);
            throw;
        }

        return new ImportResult(source.FullName, source.Name, target, sourceHash, source.Length, source.LastWriteTimeUtc);
    }

    public static string UniqueTargetPath(string folder, string fileName)
    {
        var candidate = Path.Combine(folder, fileName);
        if (!File.Exists(candidate)) return candidate;
        var stem = Path.GetFileNameWithoutExtension(fileName);
        var ext = Path.GetExtension(fileName);
        for (var i = 2; ; i++)
        {
            candidate = Path.Combine(folder, $"{stem}_{i}{ext}");
            if (!File.Exists(candidate)) return candidate;
        }
    }
}
