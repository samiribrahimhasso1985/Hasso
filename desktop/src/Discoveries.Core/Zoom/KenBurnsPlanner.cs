using System.Globalization;

namespace Discoveries.Core.Zoom;

public enum CameraMotion { SlowZoomIn, SlowZoomOut, PanLeftToRight, PanRightToLeft, KenBurns }

public sealed record CropRect(double X, double Y, double Width, double Height)
{
    public double CenterX => X + Width / 2;
    public double CenterY => Y + Height / 2;
}

/// <summary>A non-destructive motion plan: start/end crop windows in source pixels plus the
/// FFmpeg filter that renders it into a new file. The source file is never modified.</summary>
public sealed record MotionPlan(
    CameraMotion Motion, CropRect Start, CropRect End,
    int OutputWidth, int OutputHeight, double DurationSeconds, double Fps, string FfmpegFilter)
{
    public int FrameCount => (int)Math.Round(DurationSeconds * Fps);
}

public static class KenBurnsPlanner
{
    /// <param name="zoom">How far to zoom (1.0–3.0). 1.15–1.3 looks natural.</param>
    /// <param name="focusX">Point of interest (normalized 0..1) — e.g. a face for subject tracking.</param>
    public static MotionPlan Plan(
        int sourceWidth, int sourceHeight, int outputWidth, int outputHeight,
        CameraMotion motion, double durationSeconds, double fps = 25, double zoom = 1.2,
        double focusX = 0.5, double focusY = 0.5)
    {
        if (sourceWidth <= 0 || sourceHeight <= 0 || outputWidth <= 0 || outputHeight <= 0)
            throw new ArgumentOutOfRangeException(nameof(sourceWidth));
        if (durationSeconds <= 0 || fps <= 0) throw new ArgumentOutOfRangeException(nameof(durationSeconds));
        if (zoom is < 1.0 or > 3.0) throw new ArgumentOutOfRangeException(nameof(zoom));
        focusX = Math.Clamp(focusX, 0, 1);
        focusY = Math.Clamp(focusY, 0, 1);

        var aspect = (double)outputWidth / outputHeight;
        // Largest window with the output aspect that fits in the source.
        var bw = Math.Min(sourceWidth, sourceHeight * aspect);
        var bh = bw / aspect;
        var bx = (sourceWidth - bw) / 2;
        var by = (sourceHeight - bh) / 2;
        var baseRect = new CropRect(bx, by, bw, bh);

        CropRect start, end;
        switch (motion)
        {
            case CameraMotion.SlowZoomIn:
                start = baseRect; end = Zoomed(baseRect, zoom, focusX, focusY);
                break;
            case CameraMotion.SlowZoomOut:
                start = Zoomed(baseRect, zoom, focusX, focusY); end = baseRect;
                break;
            case CameraMotion.KenBurns:
                start = Zoomed(baseRect, Math.Min(1.05, zoom), 1 - focusX, 1 - focusY);
                end = Zoomed(baseRect, zoom, focusX, focusY);
                break;
            case CameraMotion.PanLeftToRight:
            case CameraMotion.PanRightToLeft:
            {
                // Pan across the full source width; window size fixed.
                var w = bw / zoom; var h = bh / zoom;
                if (Math.Abs(w - sourceWidth) < 1) { w = bw / Math.Max(zoom, 1.15); h = w / aspect; }
                var y = Math.Clamp(focusY * sourceHeight - h / 2, 0, sourceHeight - h);
                var left = new CropRect(0, y, w, h);
                var right = new CropRect(sourceWidth - w, y, w, h);
                (start, end) = motion == CameraMotion.PanLeftToRight ? (left, right) : (right, left);
                break;
            }
            default:
                throw new ArgumentOutOfRangeException(nameof(motion));
        }

        var filter = motion is CameraMotion.PanLeftToRight or CameraMotion.PanRightToLeft
            ? PanFilter(start, end, outputWidth, outputHeight, durationSeconds)
            : ZoomFilter(baseRect, start, end, outputWidth, outputHeight, durationSeconds, fps);
        return new MotionPlan(motion, start, end, outputWidth, outputHeight, durationSeconds, fps, filter);
    }

    /// <summary>Window scaled by 1/zoom, centred on the focus point but kept inside the base window.</summary>
    private static CropRect Zoomed(CropRect b, double zoom, double fx, double fy)
    {
        var w = b.Width / zoom; var h = b.Height / zoom;
        var x = Math.Clamp(b.X + fx * b.Width - w / 2, b.X, b.X + b.Width - w);
        var y = Math.Clamp(b.Y + fy * b.Height - h / 2, b.Y, b.Y + b.Height - h);
        return new CropRect(x, y, w, h);
    }

    private static string N(double v) => Math.Round(v, 3).ToString(CultureInfo.InvariantCulture);
    private static int Even(double v) => Math.Max(2, (int)Math.Floor(v / 2) * 2);

    private static string PanFilter(CropRect s, CropRect e, int ow, int oh, double d) =>
        $"crop=w={Even(s.Width)}:h={Even(s.Height)}:" +
        $"x='{N(s.X)}+({N(e.X - s.X)})*min(t/{N(d)}\\,1)':y='{N(s.Y)}+({N(e.Y - s.Y)})*min(t/{N(d)}\\,1)'," +
        $"scale={ow}:{oh},setsar=1,format=yuv420p";

    private static string ZoomFilter(CropRect b, CropRect s, CropRect e, int ow, int oh, double d, double fps)
    {
        var frames = Math.Max(2, (int)Math.Round(d * fps));
        var z0 = b.Width / s.Width; var z1 = b.Width / e.Width;
        // Centres relative to the base window (the canvas zoompan sees after the first crop).
        var cx0 = s.CenterX - b.X; var cy0 = s.CenterY - b.Y;
        var cx1 = e.CenterX - b.X; var cy1 = e.CenterY - b.Y;
        var p = $"on/{frames - 1}";
        return $"crop={Even(b.Width)}:{Even(b.Height)}:{Even(b.X)}:{Even(b.Y)}," +
               $"zoompan=z='{N(z0)}+({N(z1 - z0)})*{p}':" +
               $"x='({N(cx0)}+({N(cx1 - cx0)})*{p})-iw/zoom/2':" +
               $"y='({N(cy0)}+({N(cy1 - cy0)})*{p})-ih/zoom/2':" +
               $"d=1:s={ow}x{oh}:fps={N(fps)},setsar=1,format=yuv420p";
    }
}
