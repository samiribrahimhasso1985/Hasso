# Implementation status

Legend: **Implemented** = code written · **Tested** = covered by passing automated tests · **Needs device** = must be checked on real hardware · **Needs key** = needs a user API key.

| Feature | Implemented | Unit-tested | Needs device | Needs key |
| --- | --- | --- | --- | --- |
| Episode numbering (draft at creation, official at publication, never reused) | Yes | Yes (logic) | — | — |
| Episode statuses (11) + "incomplete" filter | Yes | Yes | — | — |
| Room database, approvals log | Yes | No (needs instrumented tests) | — | — |
| Scene segmentation + reading-time estimate | Yes | Yes | — | — |
| Change-aware scene re-sync (approved scenes never deleted, changed ones → NEEDS_REVIEW) | Yes | Yes (planner) | — | — |
| Undo / redo, script versions, autosave | Yes | Yes (buffer) | — | — |
| TXT / Markdown / SRT / VTT import (subtitle timing removed) | Yes | Yes (cleaner) | Yes | — |
| Voice Director (SpeechRecognizer) | Yes | No | Yes (Iraqi dialect quality unknown) | — |
| AI provider calls (Claude, ChatGPT, Gemini) | Yes | Parsing + retry tested | — | Yes |
| Connection test + model list from official endpoints | Yes | No | — | Yes |
| Executive Director plans, compare mode, approval | Yes | JSON parsing + merge tested | — | Yes |
| Background Director (5 categories) | Yes | Category parsing tested | — | Yes |
| Scene AI analysis → pending asset requirements | Yes | No | — | Yes |
| Demo mode | Yes | — | — | — |
| Keystore secret storage | Yes | No | Yes | — |
| Arabic RTL / English / German UI | Yes | No | Yes | — |
| **Slice 2** — six-step workflow wizard (sequential unlock, resume, go back) | Yes | Yes (rules) | Yes | — |
| Step 2: per scene 2 Wikimedia Commons images + up to 2 Commons sounds, with published licence | Yes | Yes (parsing, pick) | Yes (network) | — |
| Step 2: 2 AI-generated images per scene (OpenAI gpt-image-1, else Gemini 2.5 Flash Image) | Yes | No | Yes | Yes |
| Step 2: music mood + sound-effect ideas (text, no file) | Yes | — | — | Yes |
| Suggestions hidden until "end of content" | Yes | Yes (rules) | — | — |
| Step 3: honest bridge status, FX3 error → fix list, distance/light/angle tips, manual take log | Yes | — | — | — |
| Step 4: end-of-content button, warning for scenes without a take, resume shooting | Yes | Yes (missing takes) | — | — |
| Step 5: approve / reject with licence checker (8 states, UNKNOWN never free, NC/ND blocked) | Yes | Yes | — | — |
| Step 6: delivery manifest JSON (scenes, approved assets, attribution) | Yes | No | Yes | — |
| Room migration v1 → v2 (new tables, `lens` column removed, data kept) | Yes | Yes (SQL compared with Room's exported schema) | Yes (upgrade on device) | — |

## Not implemented (honest list)

- DOCX / PDF import
- Video and audio generation providers (only images are generated)
- Teleprompter and assistant director (moved after slice 3)
- Live camera analysis of distance / light / angle (slice 4); step 3 shows guidance from the scene plan
- Direct "send to computer → DaVinci" (button shown disabled until the slice-3 bridge exists)
- Windows Companion Agent, QR pairing, production transfer, DaVinci project creation (slice 3)
- Sony FX3 connection over USB via the Windows bridge (phase 2, after phase-0 hardware test)
- Cost estimation (only token counts are shown; prices change and are not hard-coded)
