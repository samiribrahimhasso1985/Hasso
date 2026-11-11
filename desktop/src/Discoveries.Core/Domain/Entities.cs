namespace Discoveries.Core.Domain;

public enum EpisodeStatus { Draft, Active, InReview, Completed, Archived }

public enum ScriptSection { Intro, Scene, Ending }

public enum MediaKind { OriginalVideo, Audio, Image, Background, BRoll, Music, SoundEffect, Subtitle, Other }

public sealed class Episode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int EpisodeNumber { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>Content language code: ar, de, en.</summary>
    public string Language { get; set; } = "ar";
    public int? TargetDurationSeconds { get; set; }
    public string ScriptText { get; set; } = "";
    public EpisodeStatus Status { get; set; } = EpisodeStatus.Draft;
    /// <summary>Status to return to when an archived episode is restored.</summary>
    public EpisodeStatus? StatusBeforeArchive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    /// <summary>Folder holding this episode's media (never deleted by archiving).</summary>
    public string? ProjectFolder { get; set; }
    public List<Scene> Scenes { get; set; } = new();
}

public sealed class Scene
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EpisodeId { get; set; }
    public int Number { get; set; }
    public ScriptSection Section { get; set; }
    public string Text { get; set; } = "";
    public double EstimatedSeconds { get; set; }
    public List<Shot> Shots { get; set; } = new();
}

/// <summary>One sentence / voice-over unit. Suggestion fields are filled by the user or by AI
/// (with approval) in later phases; they start empty — never with invented content.</summary>
public sealed class Shot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SceneId { get; set; }
    public int Number { get; set; }
    public string Voiceover { get; set; } = "";
    public double EstimatedSeconds { get; set; }
    public string? Background { get; set; }
    public string? Image { get; set; }
    public string? BRoll { get; set; }
    public string? Music { get; set; }
    public string? SoundEffect { get; set; }
    public string? Movement { get; set; }
    public string? Transition { get; set; }
}

public sealed class MediaAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? EpisodeId { get; set; }
    public MediaKind Kind { get; set; }
    public string OriginalFileName { get; set; } = "";
    public string OriginalPath { get; set; } = "";
    public string StoredPath { get; set; } = "";
    public string Sha256 { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime ImportedAtUtc { get; set; }
    public string? Source { get; set; }
    public string? License { get; set; }
    public bool IsGenerated { get; set; }
    public ApprovalState Approval { get; set; } = ApprovalState.Discovered;
}

public sealed class ApprovalRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? EpisodeId { get; set; }
    public string SubjectType { get; set; } = "";
    public Guid SubjectId { get; set; }
    public ApprovalState From { get; set; }
    public ApprovalState To { get; set; }
    public ApprovalActor Actor { get; set; }
    public string? Note { get; set; }
    public DateTime AtUtc { get; set; }
}

public sealed class OperationLogEntry
{
    public long Id { get; set; }
    public DateTime AtUtc { get; set; }
    public string Category { get; set; } = "";
    public string Message { get; set; } = "";
}

/// <summary>Monotonic counters (e.g. the highest episode number ever issued, so numbers are
/// never reused even after a record is deleted).</summary>
public sealed class AppCounter
{
    public string Key { get; set; } = "";
    public int Value { get; set; }
}
