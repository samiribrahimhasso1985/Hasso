using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;

namespace Discoveries.Desktop.Services;

public sealed record EngineHealth(bool Online, bool Ffmpeg, bool Ffprobe, string? Version);

public enum EngineStartResult { Started, AlreadyRunning, PythonMissing, EngineFilesMissing }

/// <summary>Starts and talks to the local Python engine. The engine binds to 127.0.0.1 only and
/// requires a random per-launch token for every endpoint except /health.</summary>
public sealed class EngineManager : IDisposable
{
    private readonly HttpClient _http;
    private Process? _process;

    public EngineManager(int port)
    {
        Port = port;
        Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        _http = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}/"), Timeout = TimeSpan.FromSeconds(2) };
        _http.DefaultRequestHeaders.Add("X-Engine-Token", Token);
    }

    public int Port { get; }
    public string Token { get; }
    public string EngineFolder => Path.Combine(AppContext.BaseDirectory, "engine");

    private sealed record HealthDto(string? status, string? version, bool ffmpeg, bool ffprobe);

    public async Task<EngineHealth> CheckAsync(CancellationToken ct = default)
    {
        try
        {
            var dto = await _http.GetFromJsonAsync<HealthDto>("health", ct);
            return dto?.status == "ok"
                ? new EngineHealth(true, dto.ffmpeg, dto.ffprobe, dto.version)
                : new EngineHealth(false, false, false, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            return new EngineHealth(false, false, false, null);
        }
    }

    public async Task<EngineStartResult> StartAsync(CancellationToken ct = default)
    {
        if ((await CheckAsync(ct)).Online) return EngineStartResult.AlreadyRunning;
        if (!File.Exists(Path.Combine(EngineFolder, "discoveries_engine", "app.py")))
            return EngineStartResult.EngineFilesMissing;

        foreach (var (exe, prefix) in new[] { ("py", "-3 "), ("python", "") })
        {
            try
            {
                var psi = new ProcessStartInfo(exe, $"{prefix}-m discoveries_engine")
                {
                    WorkingDirectory = EngineFolder,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                psi.Environment["DISCOVERIES_ENGINE_TOKEN"] = Token;
                psi.Environment["DISCOVERIES_ENGINE_PORT"] = Port.ToString();
                var p = Process.Start(psi);
                if (p is null) continue;
                // Give uvicorn a moment; fail fast if the interpreter exits (e.g. missing packages).
                for (var i = 0; i < 20; i++)
                {
                    await Task.Delay(250, ct);
                    if (p.HasExited) break;
                    if ((await CheckAsync(ct)).Online) { _process = p; return EngineStartResult.Started; }
                }
                if (!p.HasExited) { _process = p; return EngineStartResult.Started; }
            }
            catch (System.ComponentModel.Win32Exception) { /* interpreter not on PATH, try next */ }
        }
        return EngineStartResult.PythonMissing;
    }

    public void Dispose()
    {
        try { if (_process is { HasExited: false }) _process.Kill(entireProcessTree: true); } catch { }
        _http.Dispose();
    }
}
