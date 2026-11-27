# EZIDINET Kids — Specification (v1.2)

Status: **proposal for owner approval** · major independent product area · build after the core platform.
This document is the v1.2 entry point. It **adds** the new v1.2 modules to the detailed v1.1 documents, which remain
valid: `ezidnet/EZID_KIDS_SPECIFICATION.md` (structure, age groups, guardian model), `ezidnet/EZID_KIDS_EDUCATIONAL_CONTENT.md`,
`ezidnet/EZID_KIDS_GAMES.md`, `ezidnet/EZID_KIDS_SAFETY.md`. Name: "EZID Kids" → **EZIDINET Kids**.

## 1. The 14 approved modules — consolidated
| v1.2 module | Consolidated into | Status vs v1.1 |
|---|---|---|
| Kids World | the child's home space (navigation shell) | 🆕 defined §2 |
| Learning | Learning (culture, traditions, festivals, values) | v1.1 §A |
| Languages | Languages (Kurmanji first; ar/de/en support) | v1.1 §B |
| Games | Games (8 original games) | v1.1 §C, `EZIDINET_KIDS_GAMES.md` |
| Stories | Stories (reader, audio, bedtime mode) | v1.1 §D |
| Story Maker | Creative Studio → story creation tool | 🆕 §3 |
| Creative Studio | Creative Studio (drawing, colouring, patterns, Story Maker) | v1.1 §E |
| Discovery | Discovery (maps, landmarks, journeys) | v1.1 §F |
| Kids AI | Kids AI (approved knowledge base, guardian opt-in) | v1.1 §G, `EZIDINET_AI_ECOSYSTEM.md` §5 |
| My Companion | a guide character inside Kids World — **not an AI chatbot by default** | 🆕 §4 |
| Little Speaker | Languages → speaking practice | 🆕 §5 |
| Kids Classroom | teacher-led groups for schools/language courses | 🆕 §6 |
| Achievements | Achievements (private progress, no public leaderboards) | v1.1 §H |
| Parental Control Center | Parental Control Center (adult area) | v1.1 |

Age groups 3–5, 6–8, 9–12, 13–16 (unchanged). Languages: Kurmanji learning language, Arabic/German/English support;
Kurmanji Arabic script (`ku-Arab`) for readers in Iraq/Syria (EZ-15). All games and characters are **original**.

## 2. Kids World
The child's personal home: an illustrated world (village, garden, library, studio, map) where each place opens a
module. Content shown = only what the guardian enabled and approved. No other children are visible in Kids World.

## 3. Story Maker
Children compose stories from approved building blocks (characters, places, objects, cultural motifs), add their own
text (6+) or recorded voice (with guardian permission), and illustrate with Creative Studio.
* Stories stay **private to the family**; sharing only to guardians/family members the guardian chooses.
* No free text is published anywhere; no AI-generated images of real people.
* Optional AI help (9+, guardian opt-in): suggestions from approved vocabulary only; the child stays the author.

## 4. My Companion
A friendly original guide character that welcomes the child, explains activities, celebrates progress and reminds about
breaks and screen-time limits.
* **Default: scripted** (pre-written, reviewed lines and audio) — no open conversation.
* **AI conversation only if the guardian enables Kids AI**, with the same restrictions as Kids AI (approved knowledge
  base, topic limits, no personal-data collection, safety escalation to guardian).
* Must not simulate friendship or emotional dependency ("I am your best friend"), must not ask for secrets, must not
  discourage time with family and friends, must encourage breaks. (Decision EZ-23.)

## 5. Little Speaker
Speaking practice for Kurmanji: listen to native-speaker audio → repeat → playback comparison; songs and rhymes.
* Recordings stay on the device by default; uploading for a teacher/guardian requires guardian permission and is
  deleted after the retention period.
* Speech recognition, if ever used, runs on-device or via a provider with a children's-data agreement; no voice
  profiles, no voice used for AI training.

## 6. Kids Classroom
Teacher-led classes (community schools, Kurmanji courses).
* **Teachers** are verified adult accounts approved by administrators and linked to an institution (WORLD directory);
  code of conduct; background-check requirements per country documented by the institution.
* A child joins a class only with guardian consent (invite code entered by guardian).
* Teacher ↔ child communication: **no private one-to-one messaging**; class announcements and assignment feedback only,
  visible to guardians. Children in a class see first names/avatars only (guardian choice), no profiles.
* Assignments use the same lessons, stories and games; results visible to teacher and guardian.

## 7. Content approval
New content types (lessons, stories, games, Story Maker building blocks, Companion lines) go through the human review
pipeline (`ezidnet/EZID_KIDS_EDUCATIONAL_CONTENT.md`); **parents approve new content** for their child
(per category or per item, guardian's choice).

## 8. Standalone app (future)
Separate Android/iOS app connected to the main EZIDINET backend with guardian-paired child tokens (EZ-8). The current
Android development shell (`apps/android`) is for the adult web app only.

## 9. Budget-aware build order (proposal)
K1 guardian & child model + Kids World shell + Stories (reader/audio) + Languages alphabet → K2 Learning + 2 games +
Achievements + Parental Control Center → K3 Creative Studio + Story Maker + Little Speaker → K4 Discovery + more games →
K5 Kids Classroom → K6 Kids AI / Companion AI (last). Content production (illustration, narration) is the main cost and
depends on community volunteers.
