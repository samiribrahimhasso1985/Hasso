using Discoveries.Core.Domain;

namespace Discoveries.Core.Tests;

public class ApprovalWorkflowTests
{
    [Fact]
    public void Full_user_path_reaches_timeline()
    {
        var path = new[]
        {
            (ApprovalState.Discovered, ApprovalState.Previewed),
            (ApprovalState.Previewed, ApprovalState.PendingApproval),
            (ApprovalState.PendingApproval, ApprovalState.Approved),
            (ApprovalState.Approved, ApprovalState.Downloading),
            (ApprovalState.Downloading, ApprovalState.Downloaded),
            (ApprovalState.Downloaded, ApprovalState.Verified),
            (ApprovalState.Verified, ApprovalState.AddedToProject),
            (ApprovalState.AddedToProject, ApprovalState.AddedToTimeline),
        };
        foreach (var (from, to) in path)
            Assert.True(ApprovalWorkflow.CanTransition(from, to, ApprovalActor.User), $"{from}->{to}");
    }

    [Theory]
    [InlineData(ApprovalState.PendingApproval, ApprovalState.Approved)]
    [InlineData(ApprovalState.Verified, ApprovalState.AddedToProject)]
    [InlineData(ApprovalState.AddedToProject, ApprovalState.AddedToTimeline)]
    [InlineData(ApprovalState.PendingApproval, ApprovalState.Rejected)]
    public void System_can_never_approve_or_place(ApprovalState from, ApprovalState to)
    {
        Assert.False(ApprovalWorkflow.CanTransition(from, to, ApprovalActor.System));
        Assert.Throws<ApprovalTransitionException>(() =>
            ApprovalWorkflow.Transition(from, to, ApprovalActor.System, "asset", Guid.NewGuid()));
    }

    [Fact]
    public void System_may_do_technical_steps()
    {
        Assert.True(ApprovalWorkflow.CanTransition(ApprovalState.Discovered, ApprovalState.Previewed, ApprovalActor.System));
        Assert.True(ApprovalWorkflow.CanTransition(ApprovalState.Approved, ApprovalState.Downloading, ApprovalActor.System));
        Assert.True(ApprovalWorkflow.CanTransition(ApprovalState.Downloading, ApprovalState.Downloaded, ApprovalActor.System));
        Assert.True(ApprovalWorkflow.CanTransition(ApprovalState.Downloaded, ApprovalState.Verified, ApprovalActor.System));
        Assert.True(ApprovalWorkflow.CanTransition(ApprovalState.Downloading, ApprovalState.Failed, ApprovalActor.System));
    }

    [Theory]
    [InlineData(ApprovalState.Discovered, ApprovalState.Approved)]
    [InlineData(ApprovalState.PendingApproval, ApprovalState.AddedToProject)]
    [InlineData(ApprovalState.Approved, ApprovalState.AddedToTimeline)]
    [InlineData(ApprovalState.AddedToTimeline, ApprovalState.Rejected)]
    [InlineData(ApprovalState.Downloading, ApprovalState.Verified)]
    [InlineData(ApprovalState.Failed, ApprovalState.AddedToProject)]
    public void Steps_cannot_be_skipped(ApprovalState from, ApprovalState to)
    {
        Assert.False(ApprovalWorkflow.CanTransition(from, to, ApprovalActor.User));
    }

    [Fact]
    public void Transition_produces_audit_record()
    {
        var id = Guid.NewGuid();
        var rec = ApprovalWorkflow.Transition(ApprovalState.PendingApproval, ApprovalState.Approved,
            ApprovalActor.User, "asset", id, note: "ok");
        Assert.Equal(id, rec.SubjectId);
        Assert.Equal(ApprovalState.Approved, rec.To);
        Assert.Equal(ApprovalActor.User, rec.Actor);
    }

    [Theory]
    [InlineData(ApprovalState.Approved)]
    [InlineData(ApprovalState.Verified)]
    [InlineData(ApprovalState.AddedToProject)]
    [InlineData(ApprovalState.AddedToTimeline)]
    public void Changed_approved_item_needs_new_review(ApprovalState current)
    {
        var rec = ApprovalWorkflow.RequireReviewAfterChange(current, "asset", Guid.NewGuid());
        Assert.Equal(ApprovalState.PendingApproval, rec.To);
    }

    [Fact]
    public void Unapproved_item_cannot_be_rereviewed() =>
        Assert.Throws<ApprovalTransitionException>(() =>
            ApprovalWorkflow.RequireReviewAfterChange(ApprovalState.Discovered, "asset", Guid.NewGuid()));
}
