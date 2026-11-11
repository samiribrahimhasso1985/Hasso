# CHANGELOG

## 0.2.0 — 2026-11-11 — Advanced Features Extension
### Added
- 13 new sections in navigation (48 total), all AR/DE/EN.
- Multiformat Export page (working): 6 editable, validated presets saved to the data folder.
- Core: `FrameCompositionAnalyzer`, `KenBurnsPlanner` (FFmpeg filter, non-destructive), `CostCalculator`
  (estimated vs actual never mixed), `ProjectGuard` (media integrity, read-only), `ExportPresetStore`.
- Data: `Costs` table + `CostService`; `DatabaseInitializer` now adds new tables to existing databases
  without touching existing data.
- Engine: `POST /audio/loudness` — EBU R128 loudness, LRA, true peak and issues (original untouched).
- Tests: +23 xUnit, +3 pytest.

## 0.1.0 — 2026-11-11
### Added
- Applied the expanded master prompt: 35 sections, executable `Discoveries.Desktop.exe`, bottom status bar,
  approval states DOWNLOADED/FAILED + re-review after change, delete episode *record* after explicit
  confirmation (files never deleted, numbers never reused).
- Phase 0: audit, specification, roadmap, build status.
- Phase 1: .NET 10 solution (Core, Data, Desktop WPF, xUnit tests), Python FastAPI engine with tests,
  GitHub Actions workflow building and smoke-running the app on Windows, Inno Setup installer script.
- Phase 2: cinematic theme, Arabic/German/English resource dictionaries with live switching and RTL.
- Phase 3: main window with resizable sidebar listing all 35 sections.
- Phase 4: dashboard (episodes, active projects, last project, last imports, drives, backup,
  Sony SDK status, DaVinci Resolve detection, engine status, recent operations, pending approvals).
- Phase 5: Episode Manager — create, edit, duplicate, archive (files kept), restore, search,
  script analysis into INTRO / SCENES / ENDING with shots and estimated speaking time.

### Fixed
- EF Core treated new scenes as existing rows (pre-set Guid keys) → keys now client-generated.
