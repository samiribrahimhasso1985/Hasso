# AI DIRECTOR FX3 — DISCOVERIES (اكتشافات)

Android production assistant for the vertical documentary series **DISCOVERIES — اكتشافات**.
Specification: *AI Director FX3 — unified master specification v4.3* (claude.ai project "Sony FX3").

## Status: slice 1 (vertical slice)

| Area | State |
| --- | --- |
| Android core (Kotlin, Compose, MVVM, Hilt, Room, Keystore) | Implemented |
| Cinematic dashboard, drawer navigation, Arabic RTL / English / German | Implemented |
| Episode manager (UUID, draft numbers, official number at publication, 11 statuses, search, filters) | Implemented |
| Voice Director (Android SpeechRecognizer, ar-IQ / en-US / de-DE, editable transcript, history) | Implemented — needs a real device to test |
| AI Executive Director (Claude, ChatGPT, Gemini over official REST APIs; single or compare mode) | Implemented — needs your API keys |
| AI Background Director (5 categories, approve / reject / edit / regenerate / add to scene) | Implemented — text suggestions; preview images need an image provider (phase 3) |
| Script editor (autosave, undo/redo, versions, TXT/MD import, reading-time estimate) | Implemented |
| Scene builder (segmentation, change-aware re-sync that never deletes approved work, AI analysis, assets) | Implemented |
| Demo mode (clearly labelled sample output, no keys needed) | Implemented |
| Sony FX3, Windows Companion Agent, DaVinci Resolve, teleprompter, transfer | **Not built yet** — shown as locked in the menu |

See `IMPLEMENTATION_STATUS.md` for details and `TEST_REPORT.md` for test results.

## Build

Requirements: JDK 17, Android SDK (compileSdk 34). Android Studio Koala or newer works.

```bash
./gradlew testDebugUnitTest   # unit tests
./gradlew assembleDebug       # APK
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

GitHub Actions (`.github/workflows/android.yml`) runs the tests and builds the APK on every push; download it from the run's **Artifacts** section.

## Install on the tablet

1. Copy `app-debug.apk` to the tablet.
2. Allow "Install unknown apps" for your file manager.
3. Open the APK and install. Minimum Android version: 8.0 (API 26).

## Documentation

- `ARCHITECTURE.md` — modules and data flow
- `API_SETUP.md` — adding Claude / ChatGPT / Gemini keys
- `CAMERA_COMPATIBILITY.md` — Sony FX3 plan and current state
- `DAVINCI_SETUP.md` — DaVinci Resolve plan and current state
- `PROJECT_AUDIT.md`, `IMPLEMENTATION_STATUS.md`, `TEST_REPORT.md`

## Windows desktop version (`desktop/`)

A Windows 11 version of the same app, built with Compose for Desktop from the same Kotlin code.
Shared logic (numbering, scene sync, workflow rules, licence checker, AI providers and prompts, Commons parsing)
lives in `shared/` and is used by both the tablet and Windows apps.

- On Windows now: dashboard, episodes, the six-step production workflow, AI Control Center, settings (ar/en/de, RTL).
- Data: `%APPDATA%\AIDirectorFX3\data.json` (atomic writes, previous version kept as `.bak`).
- API keys: encrypted with Windows DPAPI for the current user (`secrets.json`), never in the code or installer.
- Step 6 exports an episode package folder: approved images/sounds, `manifest.json`, `CREDITS.txt`, `Script.txt`.
- Tablet-only for now: voice director, background director, separate scene editor.
- Build: GitHub Actions (`windows-latest`) runs `:desktop:packageMsi` and publishes an MSI and a portable ZIP.
