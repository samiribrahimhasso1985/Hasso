namespace Discoveries.Core.Composition;

public enum Facing { Camera, Left, Right }

public enum CompositionSeverity { Info, Suggestion, Warning }

/// <summary>Measurements of one frame. Subject box and eye line come from a detector (OpenCV in
/// the engine, later) or from the user marking the frame; coordinates are normalized 0..1.</summary>
public sealed record FrameObservation(
    double SubjectLeft, double SubjectTop, double SubjectWidth, double SubjectHeight,
    double? EyeLineY = null,
    Facing Facing = Facing.Camera,
    double? HorizonTiltDegrees = null,
    int BackgroundDistractions = 0);

public sealed record CompositionFinding(string Code, CompositionSeverity Severity, double Measured, double Target);

/// <summary>
/// Rule-based composition checks: headroom, eye line on the upper third, leading room,
/// horizontal balance, horizon tilt and background distractions. Pure geometry — it reports
/// what was measured, never invents a detection.
/// </summary>
public static class FrameCompositionAnalyzer
{
    public const double UpperThird = 1.0 / 3.0;

    public static IReadOnlyList<CompositionFinding> Analyze(FrameObservation o)
    {
        Validate(o);
        var f = new List<CompositionFinding>();

        // Headroom: space above the head (top of subject box).
        var headroom = o.SubjectTop;
        if (headroom < 0.03)
            f.Add(new("headroom_too_little", CompositionSeverity.Warning, Round(headroom), 0.05));
        else if (headroom > 0.20)
            f.Add(new("headroom_too_much", CompositionSeverity.Suggestion, Round(headroom), 0.10));

        // Eye line near the upper third line.
        if (o.EyeLineY is { } eye)
        {
            var delta = eye - UpperThird;
            if (Math.Abs(delta) > 0.06)
                f.Add(new(delta > 0 ? "eyeline_too_low" : "eyeline_too_high", CompositionSeverity.Suggestion, Round(eye), Round(UpperThird)));
        }

        var centerX = o.SubjectLeft + o.SubjectWidth / 2;

        // Leading (looking) room: more space in the direction the subject faces.
        if (o.Facing == Facing.Right && centerX > 0.5)
            f.Add(new("leading_room_right", CompositionSeverity.Suggestion, Round(centerX), Round(UpperThird)));
        else if (o.Facing == Facing.Left && centerX < 0.5)
            f.Add(new("leading_room_left", CompositionSeverity.Suggestion, Round(centerX), Round(1 - UpperThird)));
        else if (o.Facing == Facing.Camera && Math.Abs(centerX - 0.5) > 0.12)
            f.Add(new("off_center_facing_camera", CompositionSeverity.Info, Round(centerX), 0.5));

        // Subject cut by frame edges.
        if (o.SubjectLeft < 0.01 || o.SubjectLeft + o.SubjectWidth > 0.99)
            f.Add(new("subject_touches_side", CompositionSeverity.Warning, Round(centerX), 0.5));

        if (o.HorizonTiltDegrees is { } tilt && Math.Abs(tilt) > 1.0)
            f.Add(new("horizon_tilted", CompositionSeverity.Warning, Math.Round(tilt, 1), 0));

        if (o.BackgroundDistractions > 0)
            f.Add(new("background_distractions", CompositionSeverity.Suggestion, o.BackgroundDistractions, 0));

        return f;
    }

    private static void Validate(FrameObservation o)
    {
        static bool In01(double v) => v is >= 0 and <= 1;
        if (!In01(o.SubjectLeft) || !In01(o.SubjectTop) || o.SubjectWidth <= 0 || o.SubjectHeight <= 0
            || o.SubjectLeft + o.SubjectWidth > 1.0001 || o.SubjectTop + o.SubjectHeight > 1.0001
            || (o.EyeLineY is { } e && !In01(e)))
            throw new ArgumentOutOfRangeException(nameof(o), "Coordinates must be normalized to 0..1.");
    }

    private static double Round(double v) => Math.Round(v, 3);
}
