# ARCHITECTURE

Single `app` module, packages mirror the planned modules. MVVM + Repository, Hilt DI, Room, Coroutines/Flow, Navigation Compose.

```
com.discoveries.aidirector
├── domain/model      enums: EpisodeStatus (11), ApprovalStatus, AssetType, BackgroundCategory, ContentLanguage
├── domain/logic      pure, unit-tested: EpisodeNumbering, ReadingTime, SceneSegmenter, SceneSyncPlanner, UndoRedoBuffer
├── data/db           Room entities + DAOs (episodes, scripts, versions, scenes, assets, approvals, voice, backgrounds, plans, usage)
├── data/repo         EpisodeRepository, ScriptRepository, SceneRepository
├── ai                provider interfaces, Anthropic/OpenAI/Gemini REST providers, router, orchestrator, agents, directors
├── voice             SpeechController (SpeechRecognizer), VoiceDirector (history)
├── security          SecretStore (Android Keystore AES-GCM)
├── settings          AppSettings (non-secret prefs, active episode)
├── core/di           Hilt module (Room, OkHttp)
└── ui                Compose screens + ViewModels, theme, navigation drawer
```

## Flow of one spoken instruction

1. VoiceDirector → editable transcript (user edits before sending).
2. AIExecutiveDirector builds a prompt from `StudioContext` (real equipment only) + `ScriptDirectorAgent`.
3. AITaskRouter picks providers: demo mode → DEMO only; SINGLE → preferred configured provider; COMPARE → all enabled.
4. AIOrchestrator runs them in parallel with `AIErrorHandler` retries; `AIUsageMonitor` records tokens.
5. Each response is stored raw (`plans` table) and parsed with `AiJson`; invalid JSON is shown as an error, never replaced by fake data.
6. The user approves/rejects; the decision is written to `approvals`. A script suggestion enters the editor only as a new version.

## Rules enforced in code

- Approved scenes whose text changes become `NEEDS_REVIEW`; scenes removed from the script are flagged, never deleted.
- Backgrounds can be attached to a scene only when `APPROVED`; editing one resets it to `PENDING`.
- AI scene suggestions never change an approved scene silently; they set it to `NEEDS_REVIEW`.
- Capabilities without a provider (image/video/audio/TTS) are reported as unavailable.
- API keys live only in `SecretStore`; errors never include them.
