# FAMILY NETWORK — Master Implementation Plan

Version 1.0 · 2026-11-26 · Supersedes `IMPLEMENTATION_PLAN.md` (kept for history).

> **Phase order updated:** the owner's 7-phase plan in `FAMILY_NETWORK_MASTER_SPECIFICATION_3.0.md` §7 replaces the R1–R8 releases below. Phase 1 = R1 (detail in §9 stays valid); placement of later modules follows Specification 3.0.
Inputs: CLAUDE.md §1–33, `docs/specs/*` (Master Expansion v2.0, sitemap v1.0, smart registration, profile photo,
verified accounts & live, professional identity, My Identity), all existing docs and code.

Contents: 1 Repository inspection · 2 Existing features · 3 New features · 4 Conflicts & duplicates (reconciliation) ·
5 Preserved decisions · 6 Updated app map · 7 Updated database architecture · 8 Screen map · 9 Phased plan ·
10 Acceptance tests per release · 11 Approval gates · 12 Status of execution.

---

## 1. Repository inspection (2026-11-26)

| Path | Content | Notes |
|---|---|---|
| `IKTISHAFAT_AI_STUDIO/`, `quote-images/` | unrelated projects | untouched |
| `family-tree-network/packages/relationship-engine` | pure TS engine, 53 unit tests | core asset, reused by all modules |
| `family-tree-network/apps/api` | NestJS + Prisma + PostgreSQL, 1 migration, 26 integration tests | modules: auth, profiles, relationships, graph, audit |
| `family-tree-network/apps/web` | Next.js + Cytoscape, 7 unit + 5 e2e tests | single dashboard screen + auth screen |
| `family-tree-network/docs` | 6 architecture docs, progress report, plans, specs | |
| `.github/workflows/family-tree-network.yml` | CI | not yet observed on GitHub |

Database (migration `init`): `users`, `profiles`, `profile_stewards`, `privacy_settings`, `relationship_types`,
`relationships`, `relationship_verifications`, `communities`, `community_memberships`, `blocks`, `audit_logs`.

## 2. Features that already exist (inventory)

| Area | Feature | Where | Tested |
|---|---|---|---|
| Identity | One account ↔ one profile (`profiles.user_id UNIQUE`) | API | ✅ |
| Identity | Managed profiles (children, ancestors) with stewards | API + UI dialog | ✅ |
| Auth | Register / login (bcrypt, JWT 12 h), global guard, rate limit | API + UI | ✅ |
| Privacy | Field-level profile privacy (birth date, country, city, bio, languages) | API (no settings UI yet) | ✅ |
| Privacy | Edge visibility PUBLIC/NETWORK/FAMILY/PRIVATE, viewer-filtered algorithms, 404 for hidden people | API | ✅ |
| Privacy | Minor protection (not searchable, capped at FAMILY, no unions) | API | ✅ |
| Safety | Blocks (both directions), audit log | API (no UI) | ✅ |
| Relationships | 20+ types, 6 categories, ar/de/en labels, canonical storage + reciprocity mapping | engine | ✅ |
| Relationships | Structural validation (cycles, max 2 biological parents, gender words, duplicates, unions) | engine + DB constraints | ✅ |
| Relationships | Two-sided verification (Pending/Confirmed/Rejected/Disputed), distinct-confirmer rule for sensitive facts | engine + API + UI | ✅ |
| Relationships | Create / decide / update visibility / delete; awaiting-me inbox | API + UI | ✅ |
| Graph | Kinship derivation (in-laws, step, half, Arabic عم/خال) | engine | ✅ |
| Graph | Ego network, progressive expand/collapse, generations | engine + API + UI | ✅ |
| Graph | How Are We Connected? (verified-only default) | engine + API + UI | ✅ |
| Graph | Interactive Cytoscape graph, network & generations layouts, filters, search, RTL | UI | ✅ |
| i18n | Arabic RTL, German, English | UI | ✅ |
| Communities | Tables only (kind FAMILY/FAMILY_BRANCH/FRIEND_GROUP/WORK/OTHER) | DB + seed | — |
| Notifications | Notification tiers (priority) | engine only | ✅ (unit) |

## 3. New features (from v2.0, §28–§33) not yet built

Grouped by backend domain (v2 §28):

| Domain | New features |
|---|---|
| Identity | Registration wizard, Family ID, username & profile URL, platform email identity, phone + SMS OTP, identity-verification provider flow, profile photo capture/upload, Digital ID / Family Passport, QR tokens & scanner, My Identity hub, identity preferences & section visibility, profile preview "as others see it", identity completion |
| Professional | Professional roles (multi-role), categories directory, skills, links, qualification verification, organization affiliations |
| Relationships | Connection requests (message, channel, cancel, report), REMOVED status + relationship history, supporting evidence, family invitations, shared connections, "correct relationship type", relationship disputes handling |
| Families/Communities | Community & family-community pages, roles (owner/admin/editor/moderator/member/viewer/guest), invitations, join requests, rules |
| Social | Feed (global/family/friends/community), posts (types, audiences), comments, replies, reactions, sharing, reports, follow system, global search & discover |
| Messaging | 1:1, groups, media, voice, receipts, typing, requests, E2EE evaluation |
| Notifications | Notification centre, preferences, quiet hours, push |
| Family services | Events, reunions (hybrid), memories, life timeline, family history, family legacy, global family map |
| Videos | Public Videos, Family Videos (only these two), upload pipeline, player, discovery, comments, reactions, recommendations, moderation |
| Verification | Admin-only verified badge (applications, documents, review, appeals, revocation) |
| Interviews / Live | Celebrity profiles, interview requests & scheduling, Celebrity Studio, private interview rooms, live streaming (eligibility levels), live moderation |
| AI | Relationship, history, event, media and multilingual assistants (suggestions only) |
| Trust & Safety | Trust Center, reports, appeals, session management, data export, account deletion |
| Administration | Separate admin platform with 7 limited roles, Verification Center, Report Center, Live Control Center |
| Business | Organizations/business accounts, professional profiles, premium subscriptions, analytics |

## 4. Conflicts & duplicates — reconciliation

| # | Conflict / duplicate | Sources | Resolution |
|---|---|---|---|
| C1 | Visual identity | §3 Dark Navy & Gold · §25 Soft Minimalism · v2 §26 Modern Luxury | **v2 §26 Modern Luxury / Editorial Minimalism is approved** and replaces both. Implemented in R1.0. |
| C2 | Product name | "Family Tree Network" vs "FAMILY NETWORK" | Brand = **FAMILY NETWORK** in UI and docs. Folder/package names (`family-tree-network`, `@ftn/*`) stay to avoid churn. |
| C3 | Video sections | sitemap 09 "Video Archive", §30 "Public Videos" | **Only Public Videos and Family Videos.** No My Video Archive, no Friends Videos, no personal video storage. Memories link to Family Videos; they do not store videos themselves. Sitemap updated (§6). |
| C4 | Relationship removal | current hard delete vs v2 §4 REMOVED + history | Soft removal with status REMOVED and history — **approval gate G6** (data retention). |
| C5 | Request vs relationship states | §24.5 Accepted/Cancelled · v2 Removed | Two linked state machines: *request* {PENDING, ACCEPTED, REJECTED, CANCELLED, REPORTED, EXPIRED}; *relationship* {PENDING, CONFIRMED, REJECTED, DISPUTED, REMOVED}. One graph, no separate connection database. |
| C6 | Community roles | sitemap (Owner, Administrator, Moderator, Member, Guest) vs v2 families (Owner, Administrator, Editor, Member, Viewer) | One role enum {OWNER, ADMIN, EDITOR, MODERATOR, MEMBER, VIEWER, GUEST}; allowed set depends on community kind. Admins never get members' private content. |
| C7 | Family ID format | `FT-829471` (§24) vs `FN-829471` (§28) | Prefix **FN-**; length **gate G5** (recommend 8 random digits). |
| C8 | Audience/visibility vocabularies | edges PUBLIC/NETWORK/FAMILY/PRIVATE · posts Public/Connections/Family/Selected/Private/Community · roles "Only Me" | One shared **Audience** model: PUBLIC, CONNECTIONS (= existing NETWORK), FAMILY, SELECTED, ONLY_ME (= existing PRIVATE; for edges "only the people involved"), COMMUNITY. Existing values keep working (backward compatible) — **gate G8**. |
| C9 | Two kinds of "identity verified" | §28 provider verification at registration vs v2 §8 / §27.18 admin-approved badge | Keep separate: **identity check status** (provider, private, used for eligibility) ≠ **public VERIFIED BADGE** (admin approval only; provider result may be one piece of evidence). Who may apply → **gate G3**. |
| C10 | Professional relationships vs professional roles | relationship types COLLEAGUE… vs §32 roles vs §32 organization affiliations | Three different things: person↔person edges (graph), person roles (profile), role↔organization affiliation. Organizations become a shared entity also used by Business Accounts (R8). |
| C11 | Digital ID card vs Family Passport vs My Identity dashboard | §24/§28 step 9 · v2 §17 · §33 §4 | **One component.** Digital ID card (R1) is extended into the Family Passport with selectable fields (R3); My Identity shows it. No duplicate identity cards. |
| C12 | Global Map vs Family Map | sitemap 11 · v2 §18 | One module "Global Family Map". |
| C13 | Several timelines | life timeline · family timeline · history timeline · memory timeline | One `timeline_entries` model with scope (person / family community / history) and per-entry audience. |
| C14 | Family communities vs communities | v2 §5 · sitemap 07 · ADR-7 | Same `communities` table, `kind = FAMILY / FAMILY_BRANCH`. |
| C15 | Admin roles | sitemap 19 vs v2 §23 | v2 list (7 roles) is authoritative. |
| C16 | Release order | sitemap §22 (5 releases) vs v2 §29 (8 releases) | **v2 §29 (8 releases) is authoritative.** Professional Identity / My Identity placed in R2 (profiles), organization confirmation in R8 (needs organizations). |
| C17 | Navigation | §25 vs sitemap 20 vs v2 §27 | v2 §27: bottom bar Home · My Network · Discover · Messages · Profile + **More Services** screen. Only built modules appear (no placeholder buttons). |
| C18 | Mandatory registration data | §28 (document scan, phone, photo mandatory) vs managed child profiles, relatives without documents, accessibility | Phone mandatory for account holders; identity check per configurable policy; photo mandatory for account holders with accessible alternatives; managed profiles exempt — **gates G2, G3, G4**. |

## 5. Previously approved decisions that remain in force
Graph architecture (no traditional tree) · one person = one profile · canonical relationship storage + derived kinship ·
two-sided verification with distinct confirmers for sensitive facts · stewards for unclaimed profiles · viewer-filtered
algorithms · minors' protection · audit log · pure engine + adapters · PostgreSQL/Prisma modular monolith · Next.js web,
Flutter mobile (later) · Arabic RTL / German / English · AI never confirms relationships · only humans (admins) grant
the verified badge · identity verification ≠ relationship verification.

## 6. Updated application map

**Bottom navigation (mobile):** Home · My Network · Discover · Messages · Profile (+ contextual Create).
**Desktop:** left sidebar (main areas), central content, right panel (events, requests, suggestions, activity).
**More Services:** Videos · Families · Events · Memories · Family History · Interviews · Live · Celebrity Studio · Global Map · Family AI · Trust Center · Professional Network.

| Area | Sections | Release |
|---|---|---|
| Onboarding & registration | Welcome, language, terms/privacy, country & document, identity check, profile photo, phone OTP, email & username, Family ID, Digital ID, success | R1 |
| Home | Activity, recent connections, suggestions, quick actions, upcoming events, recent posts/memories | R2 (basic in R1) |
| My Network | Graph, category lists, shared connections, requests (pending/accepted/rejected/cancelled), disputes, history, details, How Are We Connected?, verification | R1 |
| Digital ID | My Digital ID, Family ID, My QR, scanner, scanned profile, select relationship, request, QR settings | R1 |
| Profile → **My Identity** | Overview, Personal, Family, Professional (roles), Social, Public, Education & Skills, Identity privacy, Preview as others, Completion | R1 (personal + privacy) · R2 (all dimensions) |
| Discover & search | People, family communities, public profiles, verified figures, public videos, public events, organizations | R2 |
| Social feed | Global, my, family, friends, community feeds; posts; comments; reactions; shares; reports; follow | R2 |
| Communities | Communities & family communities, roles, invitations, join requests, rules | R2 |
| Messages | Inbox, direct, groups, media, requests, archived, blocked, settings | R2 |
| Notifications | Centre, preferences, quiet hours | R2 |
| Family services | Events, reunions, memories, life timeline, family history, family legacy, Family Passport, Global Family Map | R3 |
| Videos | **Public Videos**, **Family Videos** (only these two) | R4 |
| Celebrity | Verified figures, celebrity profiles, request an interview, scheduling, Celebrity Studio, private interviews | R5 |
| Live | Live streaming, multi-guest, chat, moderators, reports, emergency controls, recording consent | R6 |
| Family AI | Relationship, history, event, media, multilingual assistants | R7 |
| Business | Professional accounts, organizations/business accounts, affiliation confirmation, premium, analytics | R8 |
| Trust & Safety | Trust Center, Privacy Center, sessions, blocks, reports, appeals, export, deletion | R1 (privacy) · R2 (reports) · ongoing |
| Administration (separate app) | Users, Verification Center, Report Center, Live Control Center, moderation, disputes, communities, subscriptions, analytics, audit, appeals | R1 (verification centre) → R8 |

## 7. Updated database architecture (target, by domain)

✅ exists · 🆕 new. All new tables via migrations; existing tables only extended additively.

| Domain | Tables | Release |
|---|---|---|
| Identity | ✅ `users` · ✅ `profiles` · ✅ `profile_stewards` · ✅ `privacy_settings` · 🆕 `user_identifiers` (family_id UNIQUE, username UNIQUE, platform_email UNIQUE, email_status) · 🆕 `sessions` · 🆕 `email_tokens` · 🆕 `phone_verifications` (encrypted number + hash for uniqueness, hashed OTP) · 🆕 `identity_documents` · 🆕 `identity_verifications` · 🆕 `document_type_rules` · 🆕 `consents` · 🆕 `registration_audit_logs` · 🆕 `profile_photos` · 🆕 `qr_tokens` (hash only) · 🆕 `qr_scan_events` · 🆕 `qr_reports` · 🆕 `identity_preferences` · 🆕 `identity_section_visibility` · 🆕 `custom_audiences` + `custom_audience_members` | R1–R2 |
| Relationships | ✅ `relationship_types` · ✅ `relationships` (+ REMOVED, evidence ref) · ✅ `relationship_verifications` · 🆕 `relationship_requests` · 🆕 `relationship_type_mappings` · 🆕 `relationship_history` · 🆕 `family_invitations` | R1 |
| Professional | 🆕 `professional_categories` · 🆕 `professional_roles` · 🆕 `professional_skills` · 🆕 `professional_links` · 🆕 `professional_verifications` · 🆕 `education_entries` · 🆕 `organization_affiliations` | R2 / R8 |
| Organizations | 🆕 `organizations` · 🆕 `organization_admins` · 🆕 `organization_verifications` | R8 (minimal in R2 if needed) |
| Communities | ✅ `communities` · ✅ `community_memberships` (roles extended) · 🆕 `community_invitations` · 🆕 `membership_requests` · 🆕 `community_rules` | R2 |
| Social | 🆕 `posts` (audience) · `post_audience` · `post_media` · `comments` · `reactions` · `shares` · `saved_posts` · `follows` · `mentions` · `hashtags` | R2 |
| Messaging | 🆕 `conversations` · `conversation_members` · `messages` · `message_attachments` · `message_requests` | R2 |
| Notifications | 🆕 `notifications` · `notification_preferences` · `mutes` · `push_devices` | R1 (minimal) / R2 |
| Media | 🆕 `media_assets` (object storage key, checksum, processing status, owner, audience) | R2 |
| Family services | 🆕 `events` · `event_invitations` · `event_attendees` · `reunions` · `memories` · `memory_people` (consent status) · `timeline_entries` · `history_records` · `history_sources` · `legacy_items` · `location_shares` (opt-in, country/city only) | R3 |
| Videos | 🆕 `videos` (section PUBLIC / FAMILY, access policy) · `video_access_grants` · `video_comments` · `video_reactions` · `video_reports` · `video_removal_requests` | R4 |
| Verification (badge) | 🆕 `verification_applications` · `verification_documents` (encrypted storage key, retention_expires_at) · `verification_audit_logs` (append-only) · `verified_accounts` | R1 (centre) / R5 |
| Interviews | 🆕 `interview_requests` · `interviews` · `interview_participants` · `availability_slots` | R5 |
| Live | 🆕 `live_streams` · `live_stream_participants` · `live_moderators` · `live_chat_messages` · `live_reports` · `live_moderation_actions` · `broadcast_eligibility` | R6 |
| AI | 🆕 `ai_suggestions` (never auto-applied) · `ai_activity_log` · `ai_privacy_settings` | R7 |
| Trust & Safety | ✅ `blocks` · ✅ `audit_logs` · 🆕 `reports` · `appeals` · `data_export_requests` · `deletion_requests` | R1–R2 |
| Admin | 🆕 `admin_roles` · `admin_role_assignments` · `admin_audit_logs` · `support_tickets` | R1 → R8 |
| Billing | 🆕 `plans` · `subscriptions` · `invoices` (provider references only) | R8 |

Storage rule: no images, videos or documents in PostgreSQL — S3-compatible object storage with separate, stricter
buckets for identity/verification documents (encryption, retention, access log).

## 8. Screen map

Legend: ✅ exists · 🔜 next · ⬜ planned (release)

| Area | Screens | Status |
|---|---|---|
| Auth | Welcome/Login ✅ · Register ✅ (basic) · Choose Language ✅ (switcher) · Terms & Privacy intro ⬜R1 · Forgot Password ⬜R1 · Account Recovery ⬜R1 | |
| Registration wizard | Country · Document Type · Camera Permission · Front/Back/Passport Capture · Quality Review · OCR Processing · Extracted Data Review · Identity Verification · Selfie/Liveness · Add Your Personal Photo · Phone Entry · SMS OTP · Email Suggestion · Username · Profile URL Preview · Family ID · Digital Identity Preview · Success | ⬜R1 |
| My Network | Relationship Graph ✅ · Relationship Details ✅ (panel) · How Are We Connected? ✅ · Pending Requests ✅ (inbox) · Add Relationship ✅ · Category lists ⬜R1 · Shared Connections ⬜R1 · Request History ⬜R1 · Disputes ⬜R1 | |
| Digital ID | My Digital ID · Family ID Details · My QR · QR Scanner · Scanned Profile Preview · Select Relationship · Relationship Message · Request Status · QR Settings · Regenerate/Revoke | ⬜R1 |
| My Identity | Overview · Personal ⬜R1 · Identity Privacy ⬜R1 · Preview as Others ⬜R1 · Family · Professional (13 role screens) · Social · Public · Education & Skills · Completion | ⬜R1/R2 |
| Privacy & Trust | Privacy Center ⬜R1 · Blocked Users ⬜R1 · Sessions ⬜R1 · Data Export ⬜R1 · Delete Account ⬜R1 · Reports/Appeals ⬜R2 | |
| Admin (separate app) | Admin Login · Dashboard · Verification Center · Identity Verification Queue · Suspicious QR Activity · Audit Logs · Role Management | ⬜R1 |
| R2–R8 | per §6 | ⬜ |

## 9. Phased implementation plan (Release 1 in detail)

Every increment: migration (if any) → backend + tests → UI + tests → e2e → docs → `PROGRESS_REPORT.md`.

| Inc. | Scope | Gate |
|---|---|---|
| **R1.0** | Design system Modern Luxury (tokens, self-hosted Inter + IBM Plex Sans Arabic, restyle all existing screens, graph colours/line styles, brand FAMILY NETWORK), design documentation (6 docs) | none (approved) |
| R1.1 | Auth hardening: httpOnly cookie sessions + refresh rotation, sessions list/revoke, email verification, password reset | **G1** |
| R1.2 | Identifiers: Family ID, username, `/@username`, platform-email reservation (transliteration), backfill | **G5** |
| R1.3 | Phone + SMS OTP (provider interface, labelled dev provider) | **G2** |
| R1.4 | Profile photo: object storage, capture/upload/editor, EXIF/GPS stripping, signed URLs | **G4** |
| R1.5 | Identity check framework: document rules per country, provider interface, statuses, consents | **G3** |
| R1.6 | QR tokens, scanner, scan events, QR settings, reports | after G5 |
| R1.7 | Connection requests (cancel, report, message), REMOVED + relationship history, minimal notifications | **G6** |
| R1.8 | Registration wizard composing R1.2–R1.5 | after gates |
| R1.9 | Digital ID card, My Identity (personal) + Privacy Center, preview-as-others, export, deletion, unified audiences | **G8** |
| R1.10 | Admin platform v1: roles, Verification Center (badge applications, manual approval only), identity queue, suspicious QR, audit viewer | **G7** |

Releases R2–R8 follow v2 §29 with the additions of §6/§7 above (My Identity dimensions and professional roles in R2,
organization confirmation in R8). Live streaming (R6) starts only after moderation, reporting and emergency controls
exist and legal review is done.

## 10. Acceptance tests per release

**R1 Core Platform**
- Every account receives a unique, permanent, non-sequential Family ID (FN-…); no PII inside; unique under concurrency.
- Username and platform email unique; Arabic names transliterated; alternatives offered; reservation transactional.
- Phone: E.164 per country, OTP hashed, expiry, cooldown, attempt lockout, one verified phone ↔ one account, phone never visible to others.
- Profile photo: camera + upload; invalid/forged files rejected; EXIF/GPS removed; private photo not reachable publicly; profile photo ≠ identity status.
- Identity check: statuses Not Started→Expired; sandbox provider can never produce "Verified" in production; no document data in any API response to others.
- QR: correct account resolved; expired/revoked tokens rejected; uniform responses (no enumeration); scan never creates a relationship; QR on/off respected; scan events audited.
- Requests: select type (all §24.4 words); reciprocal labels correct; accept → graph updated; reject/cancel → no confirmed edge; report works; REMOVED keeps history.
- Privacy Center: each field/section audience enforced by API; preview-as-others equals real API output; export complete; deletion removes personal data.
- Admin: verified badge only after manual approval by a Verification Administrator; non-admins and other admin roles cannot approve; every decision in append-only audit log.
- Existing suites stay green (engine 53, API 26+, web, e2e); Arabic RTL / German / English for all new screens.

**R2 Social Platform** — post audiences enforced server-side (public/connections/family/selected/private/community); feeds contain only authorized posts; blocked/muted rules; communities roles (family admin cannot read private member content); invitations & join requests; messaging authorization; notification preferences, quiet hours, dedupe; search never returns private profiles/relationships/media; My Identity dimensions with field-level visibility; multiple professional roles, self-declared never shown as verified.

**R3 Family Services** — event/reunion invitations, RSVP, private locations hidden; memories with consented tagging; per-entry timeline visibility; history distinguishes verified vs unverified; Family Passport shows only selected fields; map opt-in, country/city level only, hideable.

**R4 Video Platform** — only Public Videos and Family Videos exist; family videos never reachable publicly (signed URLs, access grants); download permission respected; moderation & removal requests; no My Video Archive / Friends Videos routes or tables.

**R5 Celebrity Platform** — badge display & click text (ar/en); interview workflow incl. alternative proposals, cancellation, expiry, timezone conversion; private rooms authorized only; private interviews never public without all participants' approval; Studio shows only real metrics.

**R6 Live** — eligibility levels enforced; moderation, reporting, emergency termination, recording consent, audit logs, network interruption handling; public live disabled until the safety stack is operational.

**R7 Family AI** — suggestions stored as suggestions only; no automatic confirmation, publication or permission change; respects viewer permissions; no training on private content.

**R8 Business & expansion** — organization admins confirm affiliations; organization verification separate from personal; subscriptions never grant verification; security audit, performance, accessibility, store builds.

## 11. Approval gates (decisions that affect architecture, data or privacy)

| Gate | Decision needed | Recommendation |
|---|---|---|
| **G1** | Move web sessions from bearer token in `sessionStorage` to httpOnly cookies + refresh-token rotation; new `sessions` table | Approve (security best practice) |
| **G2** | Phone numbers: mandatory for account holders? storage (encrypted value + keyed hash for uniqueness); policy for an already-used phone (block vs recovery flow); SMS provider | Mandatory; encrypted + hash; recovery flow instead of second account; choose provider later (dev provider labelled) |
| **G3** | Identity check: mandatory for all or by policy; provider; who may apply for the public badge (anyone vs public figures only); retention period | Policy-based (required for badge, live, Vault); provider SDK; anyone may apply; provider results only, no images |
| **G4** | Object storage (MinIO locally, S3/R2 in production); profile photo mandatory for account holders; default photo audience | Approve; mandatory with accessible alternative; default CONNECTIONS |
| **G5** | Family ID length (6 vs 8 digits) and backfill of existing accounts; real domain for emails/URLs | FN- + 8 digits; backfill all accounts; domain configurable until confirmed |
| **G6** | Replace hard delete of relationships with REMOVED + history; retention period for removed relationships | Approve; keep history 24 months, then anonymise |
| **G7** | Separate admin web app (`apps/admin`) with its own login and the 7 roles; MFA mandatory for admins | Approve |
| **G8** | Unified audience model (adds SELECTED, COMMUNITY; NETWORK shown as "Connections", PRIVATE as "Only me / only us") | Approve (backward compatible) |

## 12. Status of execution
- **R1.0 Design system — done (2026-11-26).** Tokens, fonts, restyle of all existing screens, 6 design docs; tests: engine 53, API 26, web 12, e2e 5 — all green.
- R1.1–R1.10 — **waiting for approval gates G1–G8** (§11).
