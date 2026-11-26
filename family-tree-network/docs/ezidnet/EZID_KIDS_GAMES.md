# EZID Kids — Games (v1.1)

All games are **original designs** for EZIDNET (no copies of existing commercial games). Common rules: no purchases,
no ads, no timers that pressure young children, no chat or multiplayer with strangers, progress saved only as
stars/levels, full play possible with audio-only instructions for 3–5, accessible controls (large targets, colour-blind
safe palettes, captions), works offline once approved content is cached (future).

| Game | Ages | Goal | Mechanics | Content source | Data stored |
|---|---|---|---|---|---|
| **EZID Memory** | 3–8 | memory, vocabulary | flip cards to match picture ↔ picture (3–5) or picture ↔ Kurmanji word with audio (6–8) | vocabulary set | level, stars |
| **EZID Puzzle** | 3–12 | observation, culture | drag pieces to rebuild illustrated cultural scenes; piece count by age (4 → 48) | approved illustrations | puzzles completed |
| **EZID Alphabet** | 4–10 | Kurmanji letters | hear a letter, find it; trace it; build first words; special letters ç ê î ş û | alphabet cards + audio | letters mastered |
| **EZID Coloring** | 3–12 | creativity, patterns | color pages with cultural patterns and traditional clothing; free-draw mode | coloring pages | creations (private to guardians) |
| **EZID Quiz** | 6–16 | knowledge check | multiple choice with picture options; questions per age and topic; explanations after each answer | reviewed question bank | score per topic |
| **EZID World Explorer** | 6–16 | geography, diaspora | explore an illustrated map: landscapes, landmarks, places where Yazidi communities live today; collect "postcards" | Discovery content | postcards collected |
| **Build an EZID Village** | 6–12 | culture, cooperation | build a village by completing learning tasks (each task unlocks a house, garden, well, festival square); no purchases, no waiting timers | learning tasks | village state |
| **EZID Adventures** | 9–16 | stories, values, nature | chapter-based adventures with choices teaching cooperation, kindness, courage; nature and heritage settings | story scripts (reviewed) | chapter progress |

## Build order (Phase 7.6)
1 Memory · 2 Puzzle · 3 Alphabet · 4 Coloring · 5 Quiz → then World Explorer, Village, Adventures (more content and
art needed).

## Technical notes
Web canvas / SVG based, no heavy game engine (keeps bundle small and PWA-friendly); shared game shell (start, pause,
exit with guardian PIN where needed, stars screen); content loaded only from published `kids_content`.

## Acceptance tests per game
Playable with keyboard, touch and mouse · audio instructions present for 3–5 games · works in 4 languages (RTL for
Arabic support text) · no network calls outside EZIDNET · progress saved only to the child's own record · respects
screen-time limit (game pauses and returns to home).
