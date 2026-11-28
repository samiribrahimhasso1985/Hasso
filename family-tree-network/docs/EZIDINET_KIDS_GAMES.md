# EZIDINET Kids — Games (v1.2)

Status: **proposal** · consolidates `ezidnet/EZID_KIDS_GAMES.md` (8 original games, still valid).

## Principles
Original games only (no recreations of existing games, characters or art) · educational goal per game · no ads, no
in-app purchases, no loot boxes, no streaks that pressure, no public leaderboards, no chat · works offline for
already-loaded content · audio-first for ages 3–5 · RTL/LTR aware · accessible (large targets, colour-blind safe).

## Game catalogue
The eight games of v1.1 remain (see `ezidnet/EZID_KIDS_GAMES.md`). v1.2 links them to the new modules:
| Link | Use |
|---|---|
| Kids World | each game is a place/object in the world |
| Little Speaker | pronunciation mini-games (listen & repeat, sound matching) |
| Kids Classroom | teacher can assign a game level; results to teacher + guardian |
| Achievements | private stars/badges; certificates printable by guardian |
| Discovery | map-based exploration game (regions, landmarks at region level) |

## Technical
HTML5 canvas/DOM games inside the web app (later reused by the standalone app); game content (words, images, audio)
comes from the reviewed content store, so games never show unreviewed material.

## Tests
No network calls to third parties · no personal data in game events (only child pseudonymous ID + score) · works at
320 px width · RTL mirrored where meaningful.
