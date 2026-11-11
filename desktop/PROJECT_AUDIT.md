# PHASE 0 — Project Audit (Desktop Studio)

Date: 2026-11-11

## Repository
- Repo: `samiribrahimhasso1985/Hasso`, base branch `ai-director-fx3`.
- Existing content: Android app (Kotlin, Jetpack Compose, Room) — "slice 2", with its own
  GitHub Actions workflow (`.github/workflows/android.yml`) and docs at the repo root.
- **Nothing existing was deleted or changed.** The desktop studio lives in the new folder
  `desktop/` on branch `desktop-studio` (created from `ai-director-fx3`).

## Backup
- Git itself: branch `ai-director-fx3` is untouched; all desktop work is on `desktop-studio`.
- A tar.gz snapshot of the branch was also taken before any change.

## Build environment
| Item | Development sandbox (Linux) | Build/verification machine |
| --- | --- | --- |
| OS | Linux x86_64 | GitHub Actions `windows-latest` (Windows Server, Windows 11 compatible APIs) |
| .NET SDK | not installable (download blocked) | .NET 10 SDK via `actions/setup-dotnet` |
| Python | 3.13 | 3.12 via `actions/setup-python` |
| FFmpeg / FFprobe | present | installed in CI for engine tests |
| Git | present | — |

Consequence: the C#/WPF code is compiled, tested and **actually launched** on a real Windows
runner (smoke test), not in the Linux sandbox. The Python engine is tested in both.

## Hardware / external dependencies not available here
- Sony FX3 camera — not connected.
- Sony Camera Remote SDK — must be downloaded by the user after accepting Sony's licence.
- DaVinci Resolve 21 — not installed on the build machine.
- OpenAI / Anthropic / Gemini API keys — not provided.

These are detected at runtime and reported honestly; nothing is simulated as "working".
