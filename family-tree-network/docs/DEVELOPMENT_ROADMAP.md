# Development Roadmap

> **Superseded for ordering by the release plan (CLAUDE.md §27 / `IMPLEMENTATION_PLAN.md`).** Phase status below remains accurate for work done so far.

Legend: ✅ done & tested · 🟡 partial · ⬜ not started

## Current state (this iteration)

| Layer | Tests | Result |
|---|---|---|
| Relationship engine (unit) | 53 | ✅ all pass |
| API + PostgreSQL (integration) | 26 | ✅ all pass |
| Web (unit: layout, i18n/RTL) | 7 | ✅ all pass |
| Web end-to-end (real browser → Next.js → API → PostgreSQL) | 5 | ✅ all pass |

### Spec §20 test scenarios

| Scenario | Covered by |
|---|---|
| One person with parents, siblings, spouse, children, friends, colleagues | API `Omar's graph contains every required circle…`; e2e |
| Two people in different family communities share a verified relationship | API `people from different family communities…` (Karim ↔ Peter) |
| A person marries into another family | engine in-law tests; API Anna in Haddad and Weber graphs (same node) |
| Children from multiple marriages | engine/API half-sibling + former-spouse tests |
| Request rejected by the other person | API lifecycle test |
| Blocked person cannot access restricted content | API blocking test |
| Arabic RTL and German/English LTR | web unit + e2e |
| Public post / feed / notifications / muted users / private posts | ⬜ Phase 3 (notification tiers prepared in engine) |

## Phases

### Phase 1 — Foundation 🟡
- ✅ Requirements analysis, architecture docs, repository structure (npm workspaces)
- ✅ PostgreSQL + Prisma migrations, docker-compose for local DB
- ✅ Registration / login (bcrypt + JWT), global auth guard, rate limiting
- ✅ Profiles (one per person), managed profiles with stewards, field-level privacy
- ✅ Basic permissions (party/steward rules, visibility, blocks), audit log
- ⬜ Email verification, password reset, MFA, refresh tokens in httpOnly cookies
- ⬜ Profile setup wizard, account settings, privacy settings screen
- ⬜ GDPR export / deletion, consent management
- 🟡 CI workflow (added; runs engine, API and web tests)

### Phase 2 — Relationship engine ✅ (highest priority — prototype complete)
- ✅ Relationship schema (catalog, canonical edges, typed attributes, constraints)
- ✅ Relationship creation with normalisation and structural validation
- ✅ Two-sided verification (pending / confirmed / rejected / disputed), stewards, sensitive-fact rule
- ✅ Kinship derivation incl. in-laws, step and half relations, Arabic paternal/maternal terms
- ✅ Interactive graph (zoom, drag, search, profiles, filters, highlight, paths, expand/collapse, generations, RTL)
- ✅ “How Are We Connected?” (verified-only by default, localised “No verified connection found”)
- ✅ Complex family structure tests (multiple marriages, blended families, adoption, declared extended relations)
- ⬜ Relationship *suggestions* from shared parents (e.g. propose sibling links) — will reuse kinship engine (Phase 6 AI too)
- ⬜ Merging duplicate profiles (claim flow: user claims an existing managed profile)
- ⬜ Large-graph performance work: caching viewer contexts, WebGL renderer, server-side clustering

### Phase 3 — Social platform ⬜
Global feed (cursor pagination, ranking), post visibility (PUBLIC/FAMILY/FRIENDS/SELECTED/PRIVATE), media upload to
S3-compatible storage with image/video processing, comments & replies, reactions, sharing, mentions, hashtags, reporting,
special announcements with verification policy, **smart notifications** using `notificationTier()` + preferences, mutes,
blocks, quiet hours, rate limits, grouping and dedupe; notification centre; WebSocket gateway.

### Phase 4 — Communities & messaging ⬜
Community CRUD (families, branches, friend groups, work, public/private), roles, membership rules, invitations (link, QR,
email), membership requests and approvals; 1:1 and group messaging, read status, typing indicators, attachments,
E2EE evaluation (Signal protocol / MLS).

### Phase 5 — Memories & events ⬜
Archive (photos, video, audio, stories, documents) with consent-based tagging, timelines; events, invitations, RSVP,
reminders, calendar; optional global map (country/city level, opt-in only).

### Phase 6 — Family AI ⬜
Suggestions (never auto-applied), duplicate detection, natural-language people search, verified-history summaries,
path explanations, consented transcription; ar/de/en.

### Phase 7 — Production readiness ⬜
Security review & penetration test, performance/load tests (graph endpoints at 1M profiles), accessibility audit
(screen-reader list view of the graph), Flutter mobile app, deployment (containers, CI/CD, backups, monitoring), docs.

## Recommended next steps (in order)

1. **Finish Phase 1 security basics**: cookie-based sessions with refresh rotation, email verification, password reset.
2. **Profile claiming & duplicate prevention**: invite a relative to claim the managed profile created for them
   (keeps one node per person).
3. **Privacy settings & account screens** (export / delete) — GDPR.
4. Start **Phase 3** with posts + visibility + notification preferences, reusing engine tiers and visibility.
