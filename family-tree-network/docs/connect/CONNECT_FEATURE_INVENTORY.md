# EZIDINET CONNECT — Project Audit & Feature Inventory (Master Integration, Phase 1)

Date: 2026-11-28 · Branch `ccr-47c5f9b6-alewtl` · Spec: [`../specs/EZIDINET_CONNECT_MASTER_INTEGRATION.md`](../specs/EZIDINET_CONNECT_MASTER_INTEGRATION.md)

Legend: ✅ implemented **and tested** · 🟡 partial · 📄 documented / designed only (no code) · ❌ not started

## 0. Method and an important correction

Inspected the code itself (not earlier reports): Prisma schema and all 9 migrations, every NestJS controller/service,
the web app (`/`, `/app`, `/world`, `/verify`, `/reset`, `/c/[token]`, `/dev/mailbox`), the Android shell, the
relationship engine, all specs in `docs/`. Test suites were run (results in §9).

**Only two CONNECT texts were ever received in this project** — v1.0 (Friends, Messenger, Calls, Groups, Discover,
Presence, Moments, QR Connect, Contacts, Translation, Notifications, Privacy & Security, Admin) and "Complete Social
Communication System". Versions 2.0–12.0 were not received; their features are inventoried from the lists in the master
document. Nothing below is assumed to exist because an earlier message asked for it.

## 1. What exists today (facts from the code)

| Layer | Exists |
|---|---|
| Stack | npm workspaces · `apps/api` NestJS 10 + Prisma 5.22 + PostgreSQL 16 · `apps/web` Next.js 15 / React 19 · `packages/relationship-engine` · `apps/android` WebView shell · live on Render (free plan) |
| Accounts | registration (3 steps, consents), login, bcrypt, JWT + server-side `sessions`, logout / logout-all, e-mail verification, password reset, login throttle, dev outbox |
| Identity | one profile per person, EZID ID, personal QR (encrypted tokens, revoke), scan → request only, profile photo with per-photo visibility, per-field privacy |
| Relationships | 40+ types in 6 categories, verification log, PENDING/CONFIRMED/REJECTED/DISPUTED, graph, "How are we connected?", inbox |
| CONNECT (Phase 1 of the earlier plan) | friends (= FRIENDSHIP relationships), requests, followers, mutual friends, discover, presence heartbeat, CONNECT privacy settings, block |
| Other | EZIDINET WORLD globe (all countries), website, Android APK, Windows start script |

**Database — 22 tables:** `users`, `profiles`, `profile_stewards`, `privacy_settings`, `relationship_types`,
`relationships`, `relationship_verifications`, `communities`, `community_memberships`, `blocks`, `audit_logs`,
`user_identifiers`, `qr_tokens`, `qr_scan_events`, `consents`, `auth_tokens`, `sessions`, `login_throttles`,
`profile_photos`, `follows`, `connect_settings`, `user_presence`. **No duplicated tables were found.**

**API — 56 routes** in 9 controllers: auth (13), profiles (10), photos (4), relationships (7), graph (2), identity (5),
connect (17), dev outbox (1), health (1).

## 2. CONNECT Feature Inventory (hubs A–M)

### A. CONNECT HOME
| Feature | Status | Where / note |
|---|---|---|
| Welcome dashboard | ✅ (2026-11-28) | CONNECT area in `/app` (switch **Network / CONNECT** in the top bar), one request `GET /api/connect/home` |
| Friends overview (counts), friend requests (answer on the home page), suggested connections, online members (only where allowed), latest notifications | ✅ | same services and rules as the other screens; API test + tablet e2e |
| Recent messages, incoming calls | ❌ | needs Messenger / Live |
| Upcoming activities, social events, group activities, meetups, learning sessions | ❌ | needs Event Service |
| Active live rooms, podcast updates | ❌ | needs Live / Creator |
| Collaboration requests, community updates | ❌ | needs Collaboration / Communities |

### B. CONNECT MESSENGER
| Feature | Status | Note |
|---|---|---|
| Private, group, community messaging; text; replies; forwarding; editing; deleting; reactions; pins; search; read receipts; typing; message requests | ❌ | one Messaging Service planned (no second messenger) |
| Voice messages, images, videos, files | ❌ | needs storage decision D-C3 |
| Voice transcription, optional translation | ❌ | needs provider decision D-C5 (cost) |
| Conversation notifications | ❌ | needs Notification Service |

### C. CONNECT FRIENDS & PEOPLE
| Feature | Status | Note |
|---|---|---|
| Friends, friend requests (send/accept/decline/cancel/remove), mutual friends | ✅ | `ConnectService`, 13 API tests + 2-account e2e |
| Followers / following | ✅ | `follows` |
| Suggested friends, people discovery | ✅ | only mutual friends + languages members made public |
| Online status (Online/Busy/Away/Invisible, last seen, who sees it) | ✅ | heartbeat; moves to WebSocket later |
| QR Connect | ✅ | identity module (scan → request only) |
| Social profiles | 🟡 | profile + photo + field privacy; no "social profile" page (interests, about) yet |
| Trusted connections | 📄 | = CLOSE_FRIEND / confirmed family; needs a defined meaning |
| Social introductions ("A introduces B to C") | ❌ | |
| Phone contacts import | ❌ | only with explicit consent (v1.0 rule) |

### D. CONNECT LIVE
| Feature | Status | Note |
|---|---|---|
| Voice/video/group calls, voice/video rooms, live meetings, meetups, discussions, debates, public speaking, language practice, live learning, community radio, live podcast, group meetings, watch together | ❌ | **one** Call & Realtime Service with room types; needs D-C1 (WebSocket) and D-C2 (TURN, ~€5–10/month) |
| Interview rooms / live streaming (Master §30) | 📄 | same service; public streaming only after moderation is live |

### E. CONNECT GROUPS & COMMUNITIES
| Feature | Status | Note |
|---|---|---|
| Groups, clubs, circles, global circles, interest/work/learning/cultural/creative/research groups, youth communities, community labs | 🟡 | table `communities` (kind, visibility, join policy) + `community_memberships` (OWNER/ADMIN/MEMBER) exist; **no API or UI** |
| Roles Owner/Admin/Moderator/Member/Contributor/Viewer | 🟡 | 3 of 6 roles exist; extend the enum (no new table) |
| Create without prior approval; special review for fundraising, children, emergency, high-risk | 📄 | v1.2 Open Community rule |

### F. CONNECT ACTIVITIES & EVENTS
| Feature | Status | Note |
|---|---|---|
| Calendar, activities, invitations, reunions, meetups, challenges, missions, competitions, community events, mentoring events, journeys, volunteering | 📄 | also designed as Family Events (Master v2 §12) and Festival Network (v1.2) → **one Event Service** |
| Registration, RSVP, participants, reminders, time zones, updates, cancellation | ❌ | |

### G. CONNECT LEARNING & KNOWLEDGE
| Feature | Status | Note |
|---|---|---|
| Language partner, mentorship, knowledge/skill exchange, live learning, public speaking, community questions, debate, learning sessions, expert connections | ❌ | built on shared accounts, messaging, scheduling, calls |

### H. CONNECT CREATOR & MEDIA
| Feature | Status | Note |
|---|---|---|
| Creator collaboration, co-creation studio, podcast studio, social podcast, community radio, shared creative projects, watch together, shared albums, social stories (= Moments of v1.0) | ❌ | needs Media Service + storage; recording only with consent; **no third video section** (Public Videos / Family Videos only) |

### I. CONNECT DISCOVERY & GLOBAL NETWORK
| Feature | Status | Note |
|---|---|---|
| People discovery | ✅ | `/connect/discover` |
| Name search | ✅ | `/profiles/search` (overlaps with discover → unify in Search Service) |
| Communities / events / creator discovery, global directory, interest match, filters (type, language, country, declared interests) | ❌ | |
| Country & places view | ✅ | EZIDINET WORLD (places, all countries) |

### J. CONNECT COLLABORATION
| Feature | Status | Note |
|---|---|---|
| Projects, teams, tasks, responsibilities, progress, files, change log, publishing results | 📄 | also designed as Open Community projects (v1.2), Startup Hub and Family Organizer (3.0) → **one Projects & Tasks module** |

### K. CONNECT SOCIAL EXPERIENCES
| Feature | Status | Note |
|---|---|---|
| Social gaming, watch together, challenges, competitions, shared albums, stories, reunions, invitations, circles, celebrations | ❌ | reuse Events, Communities, Media, Realtime |

### L. CONNECT NOTIFICATIONS
| Feature | Status | Note |
|---|---|---|
| In-app notifications, history, unread count, read / read all / delete, preferences (categories), quiet hours (time zone, overnight), do not disturb | ✅ (2026-11-28) | **one** `NotificationsService` (`notifications`, `notification_preferences`); producers today: friend requests & acceptance, relationship requests & confirmation, new followers (withdrawn when a request is cancelled or someone unfollows); blocked people never notify; muted category = nothing created; quiet hours / DND = silent but kept. Bell + centre in the platform, 4 languages. Tests: 11 API + 2-account e2e |
| Push notifications | ❌ | Web Push (free) — D-C4 |

### M. CONNECT TRUST & SAFETY
| Feature | Status | Note |
|---|---|---|
| Blocking | ✅ | `blocks`, enforced in graph, search, CONNECT |
| Privacy control | 🟡 | field privacy + photo visibility + CONNECT settings; no single privacy centre page |
| Account protection | 🟡 | sessions list & revoke, logout-all, login throttle, password policy; no 2FA, no trusted devices, no security alerts |
| Youth safety | 🟡 | minors never searchable/followable; children connect only with family; parental controls documented |
| Reporting, appeals, moderation, scam protection, trust dashboard, digital wellbeing | ❌ | |
| Separate verification kinds (identity / profession / affiliation / account badge); badge never for money or popularity | 📄 | documented (§30, §32); not implemented |
| Audit log | ✅ | `audit_logs` for all write actions |

## 3. Overlaps and duplicates found — and how they are resolved

| Overlap | Resolution |
|---|---|
| CONNECT "friendships / friend_requests" vs existing `relationships` | **Already merged**: friends are FRIENDSHIP relationships (one system). |
| "blocked_users" vs `blocks` | Same table; no new one. |
| `privacy_settings` (profile fields) vs `connect_settings` (who may request/follow/see presence) | Different scopes — both kept; Phase 2 adds one **Privacy Service** that every module calls. |
| Friend requests appear in both the **Inbox** ("awaiting your confirmation") and **Friends → Requests** | Same records, two screens. Phase 3/4: the Inbox links to Friends for friendships instead of listing them twice. |
| `/profiles/search` vs `/connect/discover` | Same visibility rules; merged into one Search Service in Phase 10. |
| Groups, clubs, circles, labs, teams, family communities | **One** `communities` model with `kind` + extended roles (Phase 5). |
| Family Events, Festival Network, CONNECT activities/meetups/reunions/competitions/challenges/mentoring events | **One** Event Service (`events`, `event_participants`, types) (Phase 7). |
| Calls, voice/video rooms, meetups, debates, radio, live podcast, watch together, interview rooms, live streaming | **One** Call & Realtime Service with room types (Phase 6). |
| Social Stories vs Moments (v1.0) | Same feature. |
| Shared Albums vs Family Memories archive | One album/media model (Media Service). |
| Collaboration/missions/volunteer teams vs Open Community projects, Startup Hub, Family Organizer | **One** Projects & Tasks module (Phase 10). |
| Notification tiers (engine) vs a notification service | Reused: the service will call the engine for relationship-based priority. |

**Excluded features check:** nothing in CONNECT maps to My Digital Passport, My Proof, Project Hub, Company Directory,
FN Magazine, My Video Archive or Friends Videos. Stories, albums, watch together and podcasts must never become a
personal or friends video archive.

## 4. Shared core services — mapping

| # | Service | Today | Plan |
|---|---|---|---|
| 1 | User Service | ✅ auth + profiles modules | reuse |
| 2 | Friendship Service | ✅ `ConnectService` on relationships | reuse |
| 3 | Messaging Service | ❌ | Phase 4 (after D-C1, D-C3) |
| 4 | Notification Service | ✅ in-app (push later, D-C4) | done — every module calls `NotificationsService.notify()` |
| 5 | Media Service | 🟡 profile photos only | Phase 4 (storage decision D-C3) |
| 6 | Call & Realtime Service | ❌ (presence heartbeat) | WebSocket gateway (D-C1), WebRTC Phase 6 |
| 7 | Group Membership Service | 🟡 tables only | Phase 5 |
| 8 | Event Service | ❌ | Phase 7 |
| 9 | Search Service | 🟡 two endpoints | Phase 10 |
| 10 | Privacy Service | 🟡 rules spread over modules | **Phase 2 — now** (central audience check) |
| 11 | Moderation Service (reports, appeals) | ❌ | Phase 12 (reports table earlier, with Messenger) |
| 12 | File Sharing Service | ❌ | with Media Service |
| 13 | Scheduling Service | ❌ | with Event Service |
| 14 | Analytics Service | ❌ | Phase 13; aggregate only, no tracking of individuals |

## 5. Database consolidation

- No duplicated or conflicting tables today; nothing is deleted or renamed.
- Every change is an additive Prisma migration. **Rollback:** each migration ships with a matching `down.sql` in
  `docs/connect/rollback/` (drops only the objects it created; existing data untouched).
- Planned additions per phase are listed in `../EZIDINET_CONNECT_PLAN.md` §2; communities and events reuse/extend
  existing tables instead of creating `groups`.

## 6. UI today

`/app`: graph dashboard with right-hand tabs **Profile · Friends · How are we connected? · Awaiting confirmation · My
identity**. No CONNECT home, no side navigation for the 10 hubs yet. Proposed (Phase 3): a **CONNECT** area with a side
menu (desktop) / hub page (phone) for Home · Messenger · Live · Discover · Communities · Activities · Learning · Creators
· Collaboration · My Connections; each hub appears **only when it has working functions** (no placeholder buttons); the
phone bottom bar keeps 5 items.

## 7. External services & costs (nothing is bought without approval)

| Service | Why | Estimated cost | Free alternative |
|---|---|---|---|
| Render web + PostgreSQL | hosting (current) | free now; free DB **expires after 30 days**; paid DB from ~$7/month | another host |
| WebSocket real time | messages, typing, presence, call signalling | €0 (inside the existing API) | — |
| Object storage (Cloudflare R2) | images, videos, files, voice messages | 10 GB free, then ~€0.015/GB/month | PostgreSQL (small files only) |
| TURN server | calls behind strict networks | ~€5–10/month (small VPS + coturn) | STUN only (some calls fail) |
| Web Push | notifications on phones/browsers | €0 | — |
| Translation / transcription | translator, voice-to-text | paid per use (DeepL/Google/Whisper API) | self-hosted (needs a server) |
| E-mail provider | verification & password e-mails in production | free tiers exist (~3,000/month) | — |

## 8. Revised order (master phases) and status

| Phase | Content | Status |
|---|---|---|
| 1 | Audit & inventory | ✅ this document |
| 2 | Unified database & shared services | 🟡 Notification Service ✅; rollback scripts ✅ (`rollback/`); central Privacy Service deferred to Phase 4 with the first private content (messages) so it is built on real use, not in the abstract; WebSocket / storage wait for D-C1 / D-C3 |
| 3 | CONNECT Home & navigation | ✅ home + hub menu showing only working hubs (Home, My connections, Discover); other hubs appear when built (no placeholder buttons) |
| 4 | Messenger & friends integration | needs D-C1, D-C3 |
| 5–13 | as in the master spec | not started |

## 9. Evidence (test runs at the time of this audit)

engine 54/54 · API 81/81 (14 CONNECT + 10 notifications) · web unit 18/18 · browser e2e 13/13 (two-account CONNECT, notifications on phone, CONNECT Home on tablet).

## 10. Known issues

- Free Render database expires 30 days after creation (data loss risk) — owner decision needed.
- Production e-mail transport is not configured (outbox only).
- Friend requests are listed in two screens (see §3).
- Presence uses a 60-second heartbeat until the WebSocket gateway exists.
