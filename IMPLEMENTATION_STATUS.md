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
| TXT / Markdown import | Yes | No | Yes | — |
| Voice Director (SpeechRecognizer) | Yes | No | Yes (Iraqi dialect quality unknown) | — |
| AI provider calls (Claude, ChatGPT, Gemini) | Yes | Parsing + retry tested | — | Yes |
| Connection test + model list from official endpoints | Yes | No | — | Yes |
| Executive Director plans, compare mode, approval | Yes | JSON parsing + merge tested | — | Yes |
| Background Director (5 categories) | Yes | Category parsing tested | — | Yes |
| Scene AI analysis → pending asset requirements | Yes | No | — | Yes |
| Demo mode | Yes | — | — | — |
| Keystore secret storage | Yes | No | Yes | — |
| Arabic RTL / English / German UI | Yes | No | Yes | — |

## Not implemented (honest list)

- DOCX / PDF / SRT / VTT import (slice 2)
- Background gallery with 2 licensed internet images + 2 AI images per scene, preview studio (slice 2)
- Image / video / audio generation providers (phase 3)
- Teleprompter, assistant director, recording session (slice 2)
- Windows Companion Agent, QR pairing, production transfer, DaVinci project creation (slice 3)
- Sony FX3 connection over USB via the Windows bridge (phase 2, after phase-0 hardware test)
- Cost estimation (only token counts are shown; prices change and are not hard-coded)
