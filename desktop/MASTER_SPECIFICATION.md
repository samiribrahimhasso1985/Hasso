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

## Sections (48)
See `ROADMAP.md` for the phase each section is built in. Sections not yet built open a page
that states exactly what is missing — they contain no non-functional buttons.


## Advanced Features Extension (13 modules)
| # | Module | Status in 0.2.0 | Needs |
| --- | --- | --- | --- |
| 1 | AI Production Planner | Section added; built in phase 5 with Script Studio | — |
| 2 | AI Director Assistant (voice, AR/DE/EN, confirmation before sensitive actions) | Section added | Speech engine + API key |
| 3 | Camera Movement Planner (static, pan, tilt, tracking, dolly, push in, pull out, handheld, orbit + diagram) | Section added | — |
| 4 | AI Frame Composition | **Analyzer done + tested** (headroom, eye line/thirds, leading room, balance, edges, horizon, distractions). Live detection needs OpenCV in engine | Engine + camera/video |
| 5 | AI Cinematic Zoom | **Planner done + tested**: slow zoom in/out, pan, Ken Burns, focus point; produces a non-destructive FFmpeg filter (verified rendering 1080×1920). Subject *tracking* (moving focus) not yet | Engine |
| 6 | AI Visual Effects Studio | Section added. Each function will show its support limits | Engine (OpenCV / segmentation model) |
| 7 | AI Video Quality Enhancer | Section added. Writes new files only | Engine; AI upscaling/interpolation need a model or provider |
| 8 | AI Audio Mastering | **Loudness analysis done + tested** (EBU R128: integrated LUFS, LRA, true peak, issues). EQ/compression/de-essing/ducking processing later, on copies | Engine (FFmpeg) |
| 9 | AI Multiformat Export | **Working page**: YouTube 16:9, Reels/TikTok/Shorts 9:16, 4K + 1080p masters; editable, validated, saved. Rendering in phase 20 | — |
| 10 | Publishing Center | Section added. Never publishes without approval | Platform API + approval |
| 11 | AI Project Guard | **Integrity check done + tested** (missing/changed/tampered media, missing folders); DB backup exists in Settings; schema upgrade keeps old data | — |
| 12 | Production Cost Manager | **Ledger + DB table done + tested**: estimated vs actual always separate, per currency, monthly report, episode budget, AI cost estimate from tokens × user-entered price | — |
| 13 | Episode Performance | Section added. Shows nothing until a platform is linked — no sample data | YouTube Analytics API etc. |

## Approval states
DISCOVERED → PREVIEWED → PENDING_APPROVAL → APPROVED → DOWNLOADING → DOWNLOADED → VERIFIED →
 ADDED_TO_PROJECT → ADDED_TO_TIMELINE, plus REJECTED and FAILED. A changed approved item returns to PENDING_APPROVAL. Transitions to APPROVED,
ADDED_TO_PROJECT and ADDED_TO_TIMELINE require a user actor (enforced in `ApprovalWorkflow`).
