# BUILD STATUS — 0.1.0 (2026-11-11)

Verified on GitHub Actions `windows-latest` (Windows Server 2025, NT 10.0.26100 — same kernel line as Windows 11 24H2).
Release: https://github.com/samiribrahimhasso1985/Hasso/releases/tag/desktop-studio-build-2

| Check | Result |
| --- | --- |
| `dotnet build` Release (Core, Data, Desktop WPF, Tests) | ✅ |
| xUnit — 39 tests (script parser, approval state machine, import + SHA-256, Sony/Resolve detection, storage, SQLite episode integration) | ✅ 39/39 |
| Python engine — pytest (Linux + Windows), incl. real FFprobe on a generated 9:16 clip | ✅ 8/8 each |
| UI strings ar/de/en complete (136 keys, 35 sections) | ✅ |
| Self-contained publish `Discoveries.Desktop.exe` | ✅ |
| **Smoke test: real app launched**, all 35 sections opened in EN/DE/AR (RTL on in Arabic), episode created → script split (3 scenes, 4 shots) → duplicated → archived, dashboard read real DB | ✅ exit code 0 |
| Inno Setup installer `DiscoveriesDesktopStudio-Setup-0.1.0.exe` | ✅ built |

## Honest status of integrations (as detected on the build machine)
| Integration | Status | What is needed |
| --- | --- | --- |
| Sony FX3 | NOT_AVAILABLE | Official Sony Camera Remote SDK (user download + licence) and the camera on USB |
| DaVinci Resolve 21 | NOT_AVAILABLE on CI | Runs on your PC — detection reads the real install path and version |
| Python engine | Offline until started | Python 3.11+ and `pip install -r engine\requirements.txt`; then "Start engine" in Settings |
| OpenAI / Claude / Gemini | Not configured | API keys (stored securely — phase 6) |

## Known limitations of 0.1.0
- Installer is not code-signed → SmartScreen warning.
- Database uses `EnsureCreated`; EF migrations are added before the first schema change of a released version.
- Notification center, top navigation bar and docking workspace are not built yet.
- Sections other than Dashboard, Episode Manager, Storage, Settings show an honest "built in phase N" page with no buttons.
- Module split so far: Core / Data / Desktop. Camera, Media, AI, DaVinci, Storage… become separate projects when their phase starts.
