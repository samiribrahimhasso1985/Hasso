# EZIDINET Events & ÊZÎDÎ Calendar — audit, decisions and plan

Spec: [`../specs/EZIDINET_EVENTS_CALENDAR_SPEC.md`](../specs/EZIDINET_EVENTS_CALENDAR_SPEC.md) · 2026-11-28

## 1. Audit (before any change)
- **No ÊZÎDÎ CALENDAR and no events system existed in the code.** Only the design proposal
  `EZIDINET_FESTIVAL_NETWORK.md` (v1.2, status proposal) and the event lists in Master v2 §12 / CONNECT inventory hub F.
- The display rule "the day before and on the day" had not been implemented anywhere.
- The visual reference "PHASES FESTIVAL" was mentioned but no image arrived; the look follows the written description.
- Reused instead of rebuilt: accounts & sessions, profiles, friends (for "friends only" events), blocks, the unified
  Notification Service, audit log, privacy rules, the CONNECT area and its menu.

## 2. Built now (phase 1 — event infrastructure, no external costs)
| Part | What exists |
|---|---|
| Data | `calendar_days` (names ku/ar/de/en, category, texts, sources, region, tradition, template, published), `calendar_dates` (per year, VERIFIED/UNVERIFIED/DISPUTED, who verified), `events`, `event_sessions` (program, several stages), `event_attendees` (RSVP, ready for tickets), `event_saves`. Migration `events_calendar` + rollback SQL. |
| Display rule | `calendar-rules.ts`: card the day before and on every day of the holy day, in the viewer's time zone; never earlier; gone afterwards; several at once all shown; dates are entered/verified by people, never computed; nothing deleted. |
| Calendar content | 7 well-known days seeded **as unpublished drafts without dates** (names only). A calendar editor reviews, enters each year's dates and confirms them — only then do members see them. |
| Events | one publishing form → card + page automatically; categories (11) and templates (9, suggested from the category, changeable); audiences public / friends / only me; drafts; proportionate review (youth & fundraising reviewed first, everything else publishes at once); private venue visible only to participants; registration on EZIDINET with capacity, or an external link; save for later; cancel; delete; organizer-only participant list; featured events; events can celebrate a calendar day without mixing their dates. |
| Notifications | registration → organizer; time/place change and cancellation → participants; approval / rejection → organizer (EVENTS category, mutable in preferences). |
| UI | Events hub in CONNECT (Discover with filters, ÊZÎDÎ Calendar, My events, Publish, Review & calendar for staff); premium dark festival style scoped to the events area; designed cover art per template (no photos presented as historical documents); detail page with hero, countdown, program table with stage filter, speakers, place, organizer, FAQ, share, save, registration; holy-day cards (featured today / standard tomorrow / compact list) on CONNECT Home; public share page `/e/<id>`; 4 languages, RTL. |
| Staff | owner-controlled `STAFF_EMAILS` on the server (until the admin model D-C6 exists); every staff action audited. |

## 3. Not built yet — and why
| Requested | Status | Needs |
|---|---|---|
| Cover / gallery photo uploads, media gallery, Memories of Celebrations | not built | file storage decision **D-C3** (e.g. Cloudflare R2, free 10 GB) |
| Festival Live (streaming, co-hosts, chat, recording with consent) | not built | CONNECT real-time & calls (D-C1 WebSocket, D-C2 TURN); public streaming only after moderation is live |
| Event Tickets with QR | not built | free tickets/QR can be built next on `event_attendees`; **paid** tickets need a licensed payment provider + legal/tax review (Module 34) |
| Global Festival Map | not built | can reuse the WORLD globe (public city-level places only) — next candidate |
| Poster Studio (PNG/JPG/PDF export) | not built | client-side canvas export is free; after media storage |
| Social sharing card 1:1 | not built | with Poster Studio |
| Reminders chosen by the user | not built | scheduled jobs (free, in the API) |
| Reports & appeals for events | not built | Moderation Service (CONNECT phase 12) |
| Admin colour/template editor | not built | templates are code-defined; admin editing after D-C6 |

## 4. Open decisions
- **Design conflict:** the owner asked earlier the same day that all sections use the platform palette (warm sand). The
  events area now uses the dark festival palette from this specification, scoped to events only. Confirm or revert.
- Who are the calendar editors (set `STAFF_EMAILS` on Render).
- Holy-day texts, dates and sources must come from the community / cultural review group (Q-1).
