using System.IO;
using Discoveries.Core;

namespace Discoveries.Desktop.Services;

/// <summary>Plain daily log files in the data folder. Never logs API keys or tokens.</summary>
public sealed class AppLog(AppPaths paths)
{
    private readonly object _gate = new();

    public void Info(string message) => Write("INFO", message);
    public void Error(string message, Exception? ex = null) => Write("ERROR", ex is null ? message : $"{message}: {ex}");

    private void Write(string level, string message)
    {
        try
        {
            var file = Path.Combine(paths.Logs, $"app-{DateTime.UtcNow:yyyyMMdd}.log");
            lock (_gate) File.AppendAllText(file, $"{DateTime.UtcNow:O} [{level}] {message}{System.Environment.NewLine}");
        }
        catch (IOException) { /* logging must never crash the app */ }
    }
}
