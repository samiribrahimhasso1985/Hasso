using Discoveries.Core.Environment;
using Discoveries.Core.Media;

namespace Discoveries.Core.Tests;

public sealed class MediaImporterTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "discoveries-tests-" + Guid.NewGuid().ToString("N"));

    public MediaImporterTests() => Directory.CreateDirectory(_dir);
    public void Dispose() { try { Directory.Delete(_dir, true); } catch { } }

    private string MakeSource(string name, byte[] content)
    {
        var folder = Path.Combine(_dir, "card");
        Directory.CreateDirectory(folder);
        var p = Path.Combine(folder, name);
        File.WriteAllBytes(p, content);
        File.SetLastWriteTimeUtc(p, new DateTime(2025, 5, 1, 10, 0, 0, DateTimeKind.Utc));
        return p;
    }

    [Fact]
    public async Task Import_copies_verifies_and_leaves_source_untouched()
    {
        var content = new byte[300_000];
        new Random(1).NextBytes(content);
        var src = MakeSource("C0001.MP4", content);
        var before = await FileHasher.Sha256Async(src);
        var beforeTime = File.GetLastWriteTimeUtc(src);

        var result = await new MediaImporter().ImportAsync(src, Path.Combine(_dir, "project"));

        Assert.True(File.Exists(src));
        Assert.Equal(before, await FileHasher.Sha256Async(src));
        Assert.Equal(beforeTime, File.GetLastWriteTimeUtc(src));
        Assert.Equal(before, result.Sha256);
        Assert.Equal(before, await FileHasher.Sha256Async(result.StoredPath));
        Assert.Equal("C0001.MP4", result.OriginalFileName);
        Assert.Equal(content.Length, result.SizeBytes);
        Assert.Equal(beforeTime, File.GetLastWriteTimeUtc(result.StoredPath));
    }

    [Fact]
    public async Task Import_never_overwrites_existing_file()
    {
        var target = Path.Combine(_dir, "project");
        Directory.CreateDirectory(target);
        File.WriteAllText(Path.Combine(target, "C0002.MP4"), "existing");
        var src = MakeSource("C0002.MP4", [1, 2, 3]);

        var result = await new MediaImporter().ImportAsync(src, target);

        Assert.Equal("existing", File.ReadAllText(Path.Combine(target, "C0002.MP4")));
        Assert.EndsWith("C0002_2.MP4", result.StoredPath);
    }

    [Fact]
    public async Task Missing_source_throws() =>
        await Assert.ThrowsAsync<FileNotFoundException>(() =>
            new MediaImporter().ImportAsync(Path.Combine(_dir, "nope.mp4"), _dir));

    [Fact]
    public async Task Sha256_matches_known_vector()
    {
        var p = Path.Combine(_dir, "abc.txt");
        await File.WriteAllTextAsync(p, "abc");
        Assert.Equal("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", await FileHasher.Sha256Async(p));
    }

    [Fact]
    public void Sony_sdk_detection_is_honest()
    {
        Assert.Equal(FeatureStatus.NotAvailable, SonySdkLocator.Detect(null).Status);
        Assert.Equal(FeatureStatus.NotAvailable, SonySdkLocator.Detect(Path.Combine(_dir, "missing")).Status);
        Assert.Equal("Status.SonySdkFilesMissing", SonySdkLocator.Detect(_dir).DetailKey);
        File.WriteAllText(Path.Combine(_dir, "Cr_Core.dll"), "x");
        Assert.Equal("Status.SonySdkFound", SonySdkLocator.Detect(_dir).DetailKey);
    }

    [Fact]
    public void Resolve_detection_reports_missing_install()
    {
        var s = ResolveLocator.Detect([Path.Combine(_dir, "Resolve.exe")], [_dir]);
        Assert.Equal(FeatureStatus.NotAvailable, s.Status);
        File.WriteAllText(Path.Combine(_dir, "Resolve.exe"), "x");
        Assert.Equal(FeatureStatus.Supported, ResolveLocator.Detect([Path.Combine(_dir, "Resolve.exe")], [_dir]).Status);
    }

    [Fact]
    public void Storage_scan_returns_ready_drives()
    {
        var drives = StorageScanner.Scan();
        Assert.NotEmpty(drives);
        Assert.All(drives, d => Assert.InRange(d.FreePercent, 0, 100));
    }
}
