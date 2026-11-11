# Architecture (slice 1)

```
ui/            Compose screens + Hilt ViewModels (MVVM)
  dashboard/ episodes/ studio/ script/ scenes/ background/ aicenter/ settings/ common/ theme/
domain/
  model/       enums: EpisodeStatus, ApprovalStatus, AssetType, BackgroundCategory, ContentLanguage
  logic/       pure, unit-tested logic: numbering, segmentation, scene re-sync, reading time, undo/redo
data/
  db/          Room entities + DAOs (AppDatabase v1)
  repo/        EpisodeRepository, ScriptRepository, SceneRepository
ai/            provider interfaces, Claude/OpenAI/Gemini HTTP providers, router, orchestrator,
               error handler (retry), usage monitor, executive / background / scene directors
voice/         SpeechController (Android SpeechRecognizer), VoiceDirector (history)
security/      SecretStore (AES-GCM key in Android Keystore)
settings/      AppSettings (non-secret preferences, active episode)
core/di/       Hilt module (database, OkHttp)
```

## Data flow: spoken idea → plan

1. Studio screen: user records → SpeechRecognizer → editable transcript.
2. "Send" → `AIExecutiveDirector.plan()` → `AIOrchestrator.run()`.
3. `AITaskRouter` picks providers: demo, single (preferred) or compare (all enabled + configured).
4. Each provider call goes through `AIErrorHandler.withRetry` (retries 429/5xx only); usage is recorded.
5. JSON is extracted with `AiJson` and stored in `plans` as PENDING.
6. User approves / rejects; every decision is written to `approvals`.

## Approval rules in code

- Nothing AI-generated is stored as APPROVED.
- Editing an approved scene or background sets it back to NEEDS_REVIEW / PENDING.
- Re-building scenes keeps unchanged scenes (matched by SHA-256 of their text), updates changed ones, and flags removed ones instead of deleting them.
- Only an APPROVED background can be attached to a scene.

## Planned additions

Slice 2 adds tables through a Room migration (v1 → v2), without renaming existing tables: background candidates, scene media plans, camera connections, timeline items, history.
