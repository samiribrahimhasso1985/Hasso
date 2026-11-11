# MASTER SPECIFICATION — AI DIRECTOR FX3 · DISCOVERIES DESKTOP STUDIO

Windows 11 desktop production software for the DISCOVERIES channel (Sony FX3 studio).

## Architecture
```
desktop/
  src/Discoveries.Core      .NET 10 class library — domain, rules, script parser, hashing,
                            import, approval state machine, hardware/software detection
  src/Discoveries.Data      EF Core + SQLite — StudioDbContext, EpisodeService, operation log
  src/Discoveries.Desktop   WPF (net10.0-windows), MVVM (CommunityToolkit.Mvvm), DI (Generic Host)
  tests/Discoveries.Core.Tests   xUnit (unit + SQLite integration tests)
  engine/                   Python FastAPI AI/media engine (127.0.0.1 only, token protected)
  installer/                Inno Setup script
  build/                    build.ps1
```
Desktop ⇄ Engine: REST over loopback (`127.0.0.1:8765`), shared random token in header
`X-Engine-Token` (generated per launch). WebSocket and TLS are planned (see ROADMAP).

## Non-negotiable rules
1. Original media is never modified or deleted (read-only open, copy + SHA-256 verify, no overwrite).
2. No mock data shown as real results. Missing hardware/SDK/key → explicit status.
3. No creative decision, approval, timeline insertion or export without the user.
4. Asset approval ≠ adding to project ≠ adding to timeline (three separate user actions).
5. Camera: only commands confirmed by the SDK; never change settings or record without an explicit command.
6. API keys are never in source code; stored with Windows DPAPI (current user).
7. UI: Arabic (RTL), German, English — switchable live.

## Design system
Background #101010 · Panel #191919 · Secondary #222222 · Gold #C9A34F · Light gold #E8DCC6 ·
Text #F5EFE3 · Muted #A9A39A.

## Sections (35)
See `ROADMAP.md` for the phase each section is built in. Sections not yet built open a page
that states exactly what is missing — they contain no non-functional buttons.

## Approval states
DISCOVERED → PREVIEWED → PENDING_APPROVAL → APPROVED → DOWNLOADING → DOWNLOADED → VERIFIED →
 ADDED_TO_PROJECT → ADDED_TO_TIMELINE, plus REJECTED and FAILED. A changed approved item returns to PENDING_APPROVAL. Transitions to APPROVED,
ADDED_TO_PROJECT and ADDED_TO_TIMELINE require a user actor (enforced in `ApprovalWorkflow`).
