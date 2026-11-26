# Progress Report — FAMILY TREE NETWORK

Kept up to date after every phase or significant change (CLAUDE.md §26).
Last update: **2026-11-26** · Branch: `ccr-47c5f9b6-alewtl`

## 1. Summary

| Area | Status |
|---|---|
| Specification (CLAUDE.md §1–23) | ✅ saved in repository |
| Spec §24 Identity & QR | 📝 added to CLAUDE.md, gap analysis done, **not implemented yet** |
| Spec §25 new design direction (Soft Minimalism) | ⏸ recorded as *proposal*; conflicts with §3 → **decision needed** |
| Phase 1 — Foundation | 🟡 partial (auth, profiles, permissions basics done) |
| Phase 2 — Relationship engine | ✅ prototype complete end-to-end |
| Phases 3–7 | ⬜ not started (designed in docs) |

## 2. Completed work

### 2.1 Repository assessment
* The repository contained two unrelated projects (`IKTISHAFAT_AI_STUDIO/`, `quote-images/`) — left untouched.
* No Family Tree Network code existed; everything lives in `family-tree-network/`.

### 2.2 Relationship engine (`packages/relationship-engine`)
* Catalog of 20+ types in 6 categories with ar/de/en labels (male/female/neutral).
* Canonical storage ("father" stored once as PARENT; words come from gender) and an alias/mapping layer
  (FATHER ↔ SON/DAUGHTER, MANAGER ↔ EMPLOYEE, symmetric FRIEND …) — this is the "relationship mapping engine" §24.4 asks for.
* Structural validation (ancestry cycles, max two biological parents, gender contradictions, duplicates, minors, dates).
* Two-sided verification; sensitive family facts need two *different* people.
* Kinship derivation from confirmed facts only (grandparents, uncles/aunts, cousins, in-laws, step & half relations;
  Arabic عم/خال distinctions).
* "How Are We Connected?" (verified-only by default), viewer-based visibility, ego network, notification tiers.

### 2.3 API + database (`apps/api`)
* PostgreSQL schema + migration with DB-level constraints (no self-links, canonical ordering trigger, partial unique
  index, append-only verification log), advisory locks against race conditions.
* Register/login (bcrypt + JWT), rate limiting, profiles with field privacy, managed profiles (children/ancestors) with
  stewards, relationship lifecycle (create / confirm / reject / dispute / update / delete), blocks, audit log.
* Development-only fictional demo network (22 people, 32 relationships, 4 communities).

### 2.4 Web app (`apps/web`)
* Dark Navy & Gold interactive Cytoscape graph: network + generations layouts, filters, search, expand/collapse,
  path highlighting, person panel, add-relationship dialog, confirmation inbox; ar (RTL) / de / en; phone layout.

### 2.5 Documentation
`PROJECT_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `RELATIONSHIP_ENGINE.md`, `UI_UX_GUIDELINES.md`,
`DEVELOPMENT_ROADMAP.md`, `SECURITY_AND_PRIVACY.md`, README, docker-compose, CI workflow.

## 3. Test evidence (last run 2026-11-26)

| Suite | Result |
|---|---|
| Engine unit tests | 53 / 53 ✅ |
| API integration tests (real PostgreSQL) | 26 / 26 ✅ |
| Web unit tests (layout, i18n/RTL) | 7 / 7 ✅ |
| End-to-end browser tests (browser → Next.js → API → DB) | 5 / 5 ✅ (twice in a row) |
| Typecheck (engine, API, web) | ✅ |
| CI workflow on GitHub | ⚠ added but not yet observed running on GitHub |

Problems found and fixed during testing: strict query validation rejected `?locale=` (fixed); phone layout overflowed
horizontally and kept the login page's scroll position (fixed, now covered by e2e); several test expectations were
corrected where the engine was right (e.g. shortest path through a friendship rather than through family).

## 4. Gap analysis — spec §24 (Identity & QR) vs. current code

| §24 requirement | Today | Needed |
|---|---|---|
| Unique stable Family ID (FT-…) | ❌ | `user_identifiers` table; random (non-sequential) ID generated at registration, unique constraint, retry on collision |
| Personal QR with opaque token | ❌ | `qr_tokens` (store only a hash of a 256-bit random token), expiry/revocation, temporary tokens; QR encodes an app URL only |
| Scan → profile → choose type → request | 🟡 requests exist as PENDING relationships with a decision log | QR resolve endpoint (rate-limited, anti-enumeration), scanner screen (camera), request screen with message |
| Request states incl. **Cancelled**, Report button | 🟡 Pending/Confirmed/Rejected/Disputed exist | `relationship_requests` linked 1:1 to the pending relationship (same graph, no separate database); add CANCELLED + reports |
| Reciprocity mapping | ✅ in engine | expose as `relationship_type_mappings` table/endpoint |
| Notification to recipient | 🟡 "awaiting me" inbox only | in-app notification record (Phase 3 notification centre later) |
| Phone verification (SMS OTP) | ❌ | `phone_verifications`, E.164 validation, hashed OTP, expiry, resend limits; **requires an SMS provider account** — until then only a clearly-labelled development provider |
| Identity verification | ❌ | `identity_verifications` state machine, per-country document types, provider interface; **requires a verification provider contract** (e.g. IDnow, Veriff, Onfido); no document images stored |
| Extended registration (legal name, DOB, country, phone, document type) | ❌ (email/password/display name only) | registration v2 + minors' parental-authorization flow |
| QR privacy settings (disable QR requests) | ❌ | profile setting + enforcement |
| `qr_scan_events`, audit, abuse detection | 🟡 audit log exists | scan event log, per-user/IP limits, suspicious-QR reports |

## 5. Open decisions (owner input needed)

1. **Visual direction** — keep Dark Navy & Gold (§3, already built) or switch to Soft Minimalism (§25), or combine
   (e.g. Soft Minimalism light as default + low-saturation dark mode). The owner mentioned *three* strategic options;
   only one was described.
2. **SMS provider** and **identity verification provider** (needed for real phone/ID verification; nothing will be
   presented as "verified" without them).

## 6. Risks & known limitations

* Web token stored in `sessionStorage` — must move to httpOnly cookies before production.
* No email verification / password reset / MFA yet.
* Path search ≤ 8 hops; family-visibility horizon 4 hops (by design).
* Camera-based QR scanning in browsers requires HTTPS (fine in production, needs local HTTPS or localhost for testing).

## 7. Next steps (proposed order)

1. Decide the visual direction (§25).
2. Implement §24 backend: Family ID, QR tokens, QR resolve, relationship requests with Cancelled/Report, QR privacy
   setting, scan events — with all §24.12 acceptance tests.
3. §24 screens (identity, my QR, scanner, scanned profile, request, incoming requests, history, QR settings) in the
   chosen design system.
4. Phone verification with a pluggable SMS provider; identity verification state machine with a provider interface.
5. Finish Phase 1 security (cookies, email verification, password reset).

## 8. Change log

| Date | Change |
|---|---|
| 2026-11-26 | Engine, API, database, web prototype, docs, CI (commits c5dfbd5 → 735cd7a) |
| 2026-11-26 | Spec §24 (Identity & QR), §25 (design proposal, pending decision), §26 (reporting rule) added to CLAUDE.md; this report created |
