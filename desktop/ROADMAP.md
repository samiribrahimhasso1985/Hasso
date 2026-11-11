# ROADMAP (development order of the master prompt, section 44)

| Phase | Content | Status |
| --- | --- | --- |
| 1 | Repository audit, environment, backup | ✅ |
| 2 | Architecture + SQLite database | ✅ (Core / Data; more modules per phase) |
| 3 | Desktop UI + navigation (35 sections, AR/DE/EN live, RTL, status bar) | ✅ (notification center, top bar: next) |
| 4 | Dashboard + Episode Manager | ✅ |
| 5 | Script Studio (TXT/DOCX/PDF/SRT, per-sentence table, script timeline) | Next — parser already done |
| 6 | AI Provider Manager (Credential Manager key storage, routing, connection test) | Needs your API keys for live tests |
| 7 | Media Import Center | Import core (read-only, SHA-256, no overwrite) done |
| 8 | Sony FX3 camera architecture + presets | Needs Sony SDK + FX3 |
| 9 | Storyboard + Cinematic Director | Needs API key |
| 10 | Lighting Director + Live Director + Teleprompter | |
| 11 | AI Editing Engine (FFmpeg, OpenCV, proxies, timeline V1–V4/A1–A3/S1) | |
| 12 | Smart Take, Continuity, Shot Quality | |
| 13 | Audio + Music + Subtitles | |
| 14 | Color, Motion Graphics, Virtual Background, Thumbnail, Identity | |
| 15 | DaVinci Resolve 21 Bridge | Detection done |
| 16 | Final Director | |
| 17 | Storage Manager + Archive | Drive scan done |
| 18 | Approval Center + Security | State machine done (incl. DOWNLOADED, FAILED, re-review) |
| 19 | Android companion API (pairing, sync) | |
| 20 | Testing + installer | CI + installer already running from 0.1.0 |

## Advanced Features Extension — placement
| Module | Phase |
| --- | --- |
| Production Planner | 5 |
| Camera Movement Planner | 9 |
| Frame Composition (live) | 10 |
| Cinematic Zoom, Video Quality Enhancer | 11 |
| Director Assistant (voice), Audio Mastering (processing) | 13 |
| Visual Effects Studio | 14 |
| Project Guard, Cost Manager (UI) | 18 |
| Multiformat Export (rendering), Publishing Center, Episode Performance | 20 |

Explicitly excluded: "AI Lens Advisor".
