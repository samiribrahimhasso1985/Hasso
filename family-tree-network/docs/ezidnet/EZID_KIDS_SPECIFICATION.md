# EZID Kids — Complete Specification (v1.1)

Status: **proposal for owner approval** · build phase: 7 (after the core platform) · companion documents:
`EZID_KIDS_SAFETY.md`, `EZID_KIDS_EDUCATIONAL_CONTENT.md`, `EZID_KIDS_GAMES.md`, data model in `DATABASE_SCHEMA.md` §4.

## 1. Purpose
A safe, joyful place where Yazidi children aged 3–16 discover their culture, heritage, language (Kurmanji), history
and community through lessons, stories, games and creative activities — under their parents' or guardians' control.

## 2. Scope
| Section | Content | Age groups |
|---|---|---|
| A EZID Learning | identity & culture, traditions, festivals, symbols, values (respect, cooperation, coexistence) | all, adapted |
| B EZID Languages | Kurmanji letters, vocabulary, pronunciation, conversations, songs; ar/de/en support | all |
| C EZID Games | 8 original games (`EZID_KIDS_GAMES.md`) | per game |
| D EZID Stories | illustrated, audio, cultural tales, value stories, bedtime mode (speed, volume) | all |
| E EZID Creative Studio | drawing, coloring, cultural patterns, traditional clothing illustrations, projects | 3–12 (13–16 projects) |
| F EZID Discovery | interactive maps, landmarks, nature, journeys, age-adapted historical discovery | 6–16 |
| G EZID Kids AI | supervised assistant, approved knowledge base only | 6–16, guardian opt-in |
| H EZID Achievements | levels, stars, badges, progress reports, certificates | all |

## 3. Age-group experiences
| Group | Interaction | Interface | Content depth |
|---|---|---|---|
| 3–5 | tap, listen, drag | very large icons, audio prompts, almost no text, no free text input | colours, sounds, animals, simple words, songs |
| 6–8 | short reading, simple choices | large buttons, short sentences, read-aloud | letters, words, short stories, puzzles, festivals |
| 9–12 | reading, quizzes, creating | standard child UI, progress view | language, history (age-appropriate), geography, projects |
| 13–16 | research, longer reading, projects | near-adult UI inside Kids area | deeper cultural learning, history with guidance, independent projects |

The age group is set by the guardian (from birth year) and can be adjusted for learning level.

## 4. Users and roles
| Role | Can |
|---|---|
| Child | use enabled sections; see own progress, creations, achievements |
| Guardian (parent / legal guardian) | create child profile, give/withdraw consents, settings, approvals, reports, delete data |
| Content contributor | draft content (adult account, approved by admins) |
| Cultural reviewer | review cultural/historical accuracy and classification |
| Safety reviewer | review age-appropriateness and safety |
| Administrator (Kids) | publish/retire content, manage reviewers, handle reports |

## 5. Parental Control Center
Add child (consent flow) · age group & learning level · languages · content approval mode (all content needs approval /
only flagged content / none beyond platform review) · enable/disable each section and game · screen-time (daily
minutes, allowed hours) · AI on/off and scope · progress reports (weekly summary) · child privacy settings · download
creations · delete child data. Multiple guardians can be linked; changes are logged.

## 6. Key user journeys
1. **Guardian adds a child:** Parental Control Center → Add child → name (first name or nickname), birth year →
   consents (account, progress tracking; AI and voice separately) → child profile created as a protected managed
   profile → Kids mode available.
2. **Child session:** guardian opens Kids mode → selects child → age-group home → activity → stars/progress saved →
   limit reached or guardian PIN → exit.
3. **Content publication:** contributor drafts → cultural review → safety review → admin publishes for age groups and
   languages → visible to children (and subject to guardian approval mode).
4. **Report a problem:** guardian or child (simple "tell a grown-up" button that notifies the guardian) → admin review.

## 7. Data model
`DATABASE_SCHEMA.md` §4: `child_profiles`, `guardian_links`, `parental_consents`, `kids_settings`, `kids_content`,
`kids_content_versions`, `kids_content_reviews`, `kids_guardian_approvals`, `kids_progress`, `kids_achievements`,
`kids_creations`, `kids_screen_time`, `kids_ai_interactions`. Children are the same single person record
(`profiles.is_minor = true`) used in the family graph — no separate database (spec §4.5).

## 8. Permissions
Child access can read published content for its age group/languages and write only its own progress, creations and
screen-time. It can never reach social, messaging, search, profiles of other people, marketplace, creator, live or
map features. Guardians act only on children they are actively linked to. Reviewers see content, never child data.

## 9. Build plan (Phase 7, after core platform)
| Step | Deliverable |
|---|---|
| 7.1 | Guardian/child data model, consent flow, Parental Control Center (settings, screen time) |
| 7.2 | Kids area shell (`/kids`), Kids theme, age-group homes, Kids mode with PIN exit |
| 7.3 | Content pipeline (drafts, reviews, publishing) + admin review queue |
| 7.4 | Stories (reader + audio) and Learning lessons |
| 7.5 | Languages: Kurmanji alphabet, words, audio |
| 7.6 | Games: Memory, Puzzle, Alphabet, Coloring, Quiz first; World Explorer, Village, Adventures later |
| 7.7 | Creative Studio, Discovery, Achievements & certificates, progress reports |
| 7.8 | Kids AI (optional, last), only after safety review |
| 7.9 | Safety test suite (`TEST_PLAN.md` §4), accessibility, legal review sign-off |

## 10. Standalone app (future)
Same API and database; guardian-paired device tokens with child scope; offline packs of approved content; no
in-app purchases, no ads, no external links without a guardian gate.
