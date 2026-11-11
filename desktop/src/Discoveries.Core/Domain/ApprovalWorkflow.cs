namespace Discoveries.Core.Domain;

public enum ApprovalState
{
    Discovered,
    Previewed,
    PendingApproval,
    Approved,
    Rejected,
    Downloading,
    Downloaded,
    Verified,
    AddedToProject,
    AddedToTimeline,
    Failed,
}

public enum ApprovalActor { System, User }

public sealed class ApprovalTransitionException(string message) : InvalidOperationException(message);

/// <summary>
/// State machine for external/generated assets and creative decisions.
/// Approving an asset, adding it to the project and placing it on the timeline are three
/// separate transitions, each of which only the user may perform.
/// </summary>
public static class ApprovalWorkflow
{
    private static readonly Dictionary<ApprovalState, ApprovalState[]> Allowed = new()
    {
        [ApprovalState.Discovered] = [ApprovalState.Previewed, ApprovalState.Rejected],
        [ApprovalState.Previewed] = [ApprovalState.PendingApproval, ApprovalState.Rejected],
        [ApprovalState.PendingApproval] = [ApprovalState.Approved, ApprovalState.Rejected],
        [ApprovalState.Approved] = [ApprovalState.Downloading, ApprovalState.Verified, ApprovalState.Rejected, ApprovalState.PendingApproval],
        [ApprovalState.Downloading] = [ApprovalState.Downloaded, ApprovalState.Failed],
        [ApprovalState.Downloaded] = [ApprovalState.Verified, ApprovalState.Failed],
        [ApprovalState.Verified] = [ApprovalState.AddedToProject, ApprovalState.Rejected, ApprovalState.PendingApproval],
        [ApprovalState.AddedToProject] = [ApprovalState.AddedToTimeline, ApprovalState.PendingApproval],
        [ApprovalState.Rejected] = [ApprovalState.PendingApproval],
        [ApprovalState.AddedToTimeline] = [ApprovalState.PendingApproval],
        [ApprovalState.Failed] = [ApprovalState.Approved, ApprovalState.Rejected],
    };

    private static readonly HashSet<ApprovalState> UserOnlyTargets =
    [
        ApprovalState.Approved,
        ApprovalState.Rejected,
        ApprovalState.AddedToProject,
        ApprovalState.AddedToTimeline,
    ];

    public static bool CanTransition(ApprovalState from, ApprovalState to, ApprovalActor actor) =>
        Allowed.TryGetValue(from, out var targets)
        && targets.Contains(to)
        && (actor == ApprovalActor.User || !UserOnlyTargets.Contains(to));

    /// <summary>Any substantial change to an approved item sends it back for a new review.</summary>
    public static ApprovalRecord RequireReviewAfterChange(ApprovalState current, string subjectType, Guid subjectId, Guid? episodeId = null, string? reason = null)
    {
        if (current is ApprovalState.Discovered or ApprovalState.Previewed or ApprovalState.PendingApproval or ApprovalState.Rejected)
            throw new ApprovalTransitionException($"{current} is not approved; nothing to re-review.");
        return Transition(current, ApprovalState.PendingApproval, ApprovalActor.System, subjectType, subjectId, episodeId, reason ?? "changed after approval");
    }

    public static IReadOnlyList<ApprovalState> NextStates(ApprovalState from) => Allowed[from];

    public static ApprovalRecord Transition(
        ApprovalState from, ApprovalState to, ApprovalActor actor,
        string subjectType, Guid subjectId, Guid? episodeId = null, string? note = null,
        TimeProvider? clock = null)
    {
        if (!Allowed.TryGetValue(from, out var targets) || !targets.Contains(to))
            throw new ApprovalTransitionException($"Transition {from} → {to} is not allowed.");
        if (actor != ApprovalActor.User && UserOnlyTargets.Contains(to))
            throw new ApprovalTransitionException($"Only the user may move an item to {to}.");

        return new ApprovalRecord
        {
            EpisodeId = episodeId,
            SubjectType = subjectType,
            SubjectId = subjectId,
            From = from,
            To = to,
            Actor = actor,
            Note = note,
            AtUtc = (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime,
        };
    }
}
