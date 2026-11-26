# Technical Implementation Plan

Maps the complete sitemap (CLAUDE.md §27) and the new specifications (§24, §28–30) to the existing code, identifies
missing modules, and defines the build order. Date: 2026-11-26.

Legend: ✅ exists & tested · 🟡 partial · ❌ missing

## 1. Existing functionality mapped to the sitemap

| # | Sitemap module | Status | What exists today | Main gaps |
|---|---|---|---|---|
| 01 | Authentication & onboarding | 🟡 | Email/password register & login, bcrypt, JWT, rate limit | Phone + SMS OTP, identity verification, password reset, recovery, profile setup, language/terms/privacy onboarding, guardian consent, cookie sessions |
| 02 | Home dashboard | ❌ | (Graph is the current landing page) | Home, activity, suggestions, quick actions |
| 03 | My Network | ✅/🟡 | Graph, filters, kinship, path finder, verification (pending/confirmed/rejected/disputed), awaiting-me inbox, remove relationship | Request message, **Cancelled** state, request history screen, shared connections, "correct relationship type" flow, per-category list screens |
| 04 | Digital identity | ❌ | Engine's relationship mapping (reciprocal labels) is ready | Family ID, QR tokens, scanner, scanned profile preview, QR settings, regenerate/revoke, scan events |
| 05 | Discover | 🟡 | Privacy-aware name search | Filters (country, language, interests, communities, distance), suggestions, discovery preferences |
| 06 | Social feed | ❌ | Visibility model reusable | Everything |
| 07 | Communities | 🟡 | `communities` + memberships tables, demo data | API & UI, roles (owner/admin/moderator/member/guest), invitations, join requests |
| 08 | Messages | ❌ | — | Everything (incl. WebSocket gateway, E2EE evaluation) |
| 09 | Memories & archive | ❌ | — | Everything (needs object storage) |
| 10 | Events & calendar | ❌ | — | Everything |
| 11 | Global map | ❌ | Country stored on profile | Opt-in location model, map UI |
| 12 | Family AI | ❌ | Kinship engine usable for suggestions | Everything |
| 13 | People directory | ❌ | — | Contacts lists, favourites, private notes |
| 14 | Family history | ❌ | Generations layout | Timeline, stories, sources, review |
| 15 | Family vault | ❌ | — | Everything (encryption, access log) |
| 16 | Life timeline | ❌ | — | Everything |
| 17 | Notifications | ❌ | Notification tiers in engine | Notification centre, preferences, quiet hours, push |
| 18 | Profile & settings | 🟡 | Profile panel, field privacy (API), blocks (API) | Edit profile UI, privacy centre UI, settings, data export, delete account, devices |
| 19 | Administration platform | ❌ | Audit log table | Separate admin app, RBAC, queues |
| 20 | Global navigation | ❌ | Single dashboard | App shell: mobile bottom bar, desktop sidebar + right panel |
| 21 | Core product rules | ✅ (for built parts) | One node per person, confirmation, backend privacy, minors protection, audit | Export/deletion, AI separation (later) |
| §29 | Profile photo | ❌ | Initial avatars only | Capture/upload/editor, object storage |
| §30 | Verified accounts, interviews, live | ❌ | — | Everything |

**Conclusion:** the relationship core (engine, graph, verification, privacy model) is the strongest part and will be
reused by every module. Release 1 is roughly 35 % done; Releases 2–5 have not started.

## 2. Decisions and conflicts that need the owner

| # | Topic | Conflict | Recommendation |
|---|---|---|---|
| D1 | Visual identity | §3 Dark Navy & Gold (built) vs §25 Soft Minimalism (referenced again in §29.7) | Adopt Soft Minimalism (light default + low-saturation dark mode) via a central token layer; functionality unchanged |
| D2 | Product name | "Family Tree Network" vs "FAMILY NETWORK" | Use FAMILY NETWORK everywhere (brand, ID prefix) |
| D3 | Family ID prefix | `FT-829471` (§24) vs `FN-829471` (§28) | `FN-` + 8 random digits (100M space; 6 digits only allow 1M IDs and are easy to guess) |
| D4 | Domain | `familynetwork.com` used for emails and profile URLs | Must be a domain the owner actually owns — please confirm the real domain before email/URL generation goes live (configurable meanwhile) |
| D5 | Identity verification mandatory? | §28 "register by scanning a document" vs relatives invited who have no document / minors | Phone mandatory for all accounts; identity verification required by configurable policy (e.g. required for verified badge, live streaming, Vault), optional otherwise |
| D6 | Video sections | §30 "do not create a separate personal video archive" vs sitemap 09 "Video Archive" | Interpret: no separate *social* video section; public videos live in the feed; memories video archive stays private |
| D7 | Document images | §28 "do not store by default" vs §30.18 admins review uploaded documents | Two flows: registration via provider (no images stored); badge applications store encrypted documents with `retention_expires_at` and access logging |
| D8 | Biometrics (selfie, photo-to-document comparison) | Special-category data under GDPR Art. 9 | Only via provider, only with explicit consent and a DPIA; disabled by default |
| D9 | Mobile navigation | §25 (… Create …) vs §27 (… Discover …, Create contextual) | Follow §27 (newer) |

## 3. External services required (cannot be faked)

| Need | Candidates | Needed for |
|---|---|---|
| SMS OTP | Twilio Verify, Vonage, MessageBird | R1.3 — dev uses a clearly labelled console provider |
| Identity verification (capture SDK, OCR, authenticity, liveness) | IDnow (strong in DACH), Veriff, Onfido, Persona | R1.5 — **recommendation: use the provider's capture SDK** (edge detection, blur, glare, liveness, many document types per country) instead of building our own OCR |
| Object storage | S3 / Cloudflare R2; MinIO locally | R1.4 photos, R3 memories |
| Transactional email + owned domain (SPF/DKIM/DMARC) | Postmark, Amazon SES | R1.1 verification & reset, R1.2 platform email |
| Push | FCM / APNs | R2 |
| Live video | LiveKit, Mux, Cloudflare Stream, AWS IVS | R4/R5 |

## 4. Release 1 — Core Platform: incremental build order

Each increment ends with tests (unit + integration + e2e where UI exists) and an update of `PROGRESS_REPORT.md`.

| Inc. | Scope | Tables | Key tests |
|---|---|---|---|
| **R1.0 Design tokens & app shell** | Central token layer (`tokens.css`/TS), theme switch (light/dark), apply D1 to existing screens without removing features; shell with sidebar/right panel and mobile bottom bar | — | visual snapshot, contrast checks, RTL/LTR e2e, existing e2e still green |
| **R1.1 Auth hardening** | httpOnly cookie sessions, refresh-token rotation, logout everywhere, email verification, password reset, account recovery skeleton | `sessions`, `email_tokens` | token theft/rotation, reset expiry, enumeration-safe responses |
| **R1.2 Identifiers** | Family ID (non-sequential, unique), username + `/@username` URL, platform-email *reservation* (Arabic→Latin transliteration, `.01` alternatives, transactional uniqueness), backfill existing accounts | `user_identifiers`, `reserved_usernames` | uniqueness under concurrency, no PII in IDs, transliteration cases (ar/de/en) |
| **R1.3 Phone verification** | E.164 parsing per country (libphonenumber), HMAC-hashed OTP, 5-min expiry, resend cooldown, attempt limits, per-phone/IP rate limits, one verified phone ↔ one account, phone change & recovery | `phone_verifications` | expiry, brute force lockout, duplicate phone handling, phone never in API responses to others |
| **R1.4 Profile photo** | Object storage (MinIO in docker-compose), upload + webcam capture, crop/zoom/rotate editor, content sniffing, re-encode & **strip EXIF/GPS**, signed URLs honouring photo visibility | `profile_photos` | invalid files rejected, private photo not reachable publicly, replace flow |
| **R1.5 Identity verification framework** | Country/document configuration, provider interface (session → webhook), statuses Not Started…Expired, minimal result storage, **sandbox provider that never yields "Verified" outside development**, consent records | `identity_documents`, `identity_verifications`, `document_type_rules`, `consents` | status machine, no document data exposed, webhook signature check |
| **R1.6 QR system** | 256-bit tokens stored as hashes, personal + temporary tokens, regenerate/revoke, QR as app URL, uniform resolve responses (anti-enumeration), rate limits, QR on/off setting, report QR, download PNG/SVG, camera scanner (BarcodeDetector → jsQR fallback) | `qr_tokens`, `qr_scan_events`, `qr_reports` | all §24.12 QR tests |
| **R1.7 Connection requests** | `relationship_requests` linked 1:1 to the pending relationship (same graph, no separate DB), message, channel (QR/search/invite), CANCELLED, report; mapping table exposed; minimal in-app notifications; request history | `relationship_requests`, `relationship_type_mappings`, `notifications` | scan never creates a relationship; accept → graph updated; reject → no confirmed edge; reciprocal labels |
| **R1.8 Registration wizard** | Screens of §28.3 composed in order; language choice, terms & privacy intro, minors' age gate + guardian consent | `registration_audit_logs` | full flow ar/de/en, RTL/LTR |
| **R1.9 Digital ID & Privacy Center UI** | My Digital ID card, My QR, scanner, scanned profile, select relationship, request status; privacy centre (field privacy, discoverability, QR settings, blocked users), data export (JSON), delete account with grace period | — | export completeness, deletion cascades, no private data in export of others |
| **R1.10 Admin v1** | Separate `apps/admin`, admin RBAC, identity verification queue, suspicious QR activity, user management, audit viewer; no access to private content | `admin_roles`, `admin_audit_logs` | non-admin blocked, every admin action audited |

Dependencies: R1.0 waits for D1 · R1.2 waits for D2–D4 (configurable, so it can start) · real SMS and real identity
verification wait for provider accounts; everything else can be built and tested now.

## 5. Later releases (outline)

* **R2 Social:** posts with backend-enforced visibility, media pipeline, comments/replies/reactions/shares/reports,
  feeds (global, family, friends, community), discover with filters & suggestions, communities API/UI with roles,
  invitations & join requests, messaging (WebSocket, E2EE evaluation), notification centre with engine tiers,
  preferences, quiet hours, push. Moderation tooling begins here.
* **R3 Personal archive:** memories & albums with consented tagging, events & calendar, life timeline, people directory
  with private notes, family history with verified/unverified separation.
* **R4 Advanced:** Family AI (suggestions only, human approval), global map (opt-in, country/city), Family Vault
  (envelope encryption, access log), analytics, subscriptions; **verified accounts + admin Verification Center +
  interview requests** (§30 phase 1).
* **R5 Production & expansion:** security audit, performance, accessibility, localisation (Kurdish), GDPR review,
  Flutter apps for App Store / Google Play; **live streaming (§30 phases 2–3) only after moderation, reporting,
  emergency termination and legal review are operational.**

## 6. Engineering rules carried forward
* One person = one profile; all new modules reference `profiles`, never copies.
* Every new content type stores visibility and is filtered by the same viewer-context mechanism as the graph.
* External providers behind interfaces; development fakes are labelled and impossible to enable in production.
* Every increment: migration + tests + docs + progress report; no working feature replaced without approval.
