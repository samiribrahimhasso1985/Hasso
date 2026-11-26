# FAMILY NETWORK — Master Specification 3.0

**The single reference for Claude Code and the team.** Version 3.0 · 2026-11-26.
It consolidates every specification, decision and addition received so far. Full original texts are kept as appendices
in `docs/specs/` and are cited by section; this document defines how they fit together.

**Precedence rules**
1. A later decision of the product owner overrides an earlier one. This document records which one won.
2. The non-negotiable rules (§2) can only be changed by an explicit owner decision.
3. Anything marked **PROPOSED** is my recommendation and is not built until the owner confirms (§10 open questions).
4. Data, privacy, payment or architecture changes need owner approval before implementation (gates, §9).

---

## 1. Vision
FAMILY NETWORK is a **global human connection platform**: one trusted digital identity per person that connects
family, friends, colleagues, communities, public figures, creators and businesses.
What makes it different (owner): a person is not just a social account — they own a connected personal, family,
professional and public identity and can turn it into real relationships, collaboration and knowledge.
One integrated platform; every module plugs into the central identity, relationship, permission, notification and
payment systems.

## 2. Non-negotiable rules
1. **Relationship graph, not a family tree.** People are nodes, relationships are typed edges; the tree is one view.
2. **One person = one account = one internal identity = one profile.** No duplicate person records, no separate accounts for roles, stores or public personas.
3. **Every relationship starts as a request** and needs appropriate confirmation; QR scans, invitations and AI never create confirmed relationships.
4. **Verification kinds are independent** (§5.4) — none proves another.
5. **The FAMILY NETWORK VERIFIED BADGE is granted only by human administrators**; never automatic, self-uploaded, paid or popularity-based.
6. **Only two video sections: Public Videos and Family Videos.** No My Video Archive, no Friends Videos, no alternative personal video storage. Private family content never becomes public automatically.
7. **Privacy enforced in the backend** for every field, section, edge, post, video and search result; children get enhanced protection.
8. **AI only suggests** — it never confirms relationships or identity, publishes, or changes permissions, and never trains on private content without consent.
9. **Money:** never store card data; every transaction has a ledger entry; never display fabricated revenue or statistics; coins are not cash or investments; legal and tax review before enabling payments in a market.
10. **Arabic RTL, German and English LTR** everywhere; Kurdish later.
11. **Design:** Modern Luxury / Editorial Minimalism (`docs/design/`).
12. **Engineering:** modular monolith, migrations with backward compatibility, tests for every main flow, no placeholder buttons, never claim an untested integration works, never remove existing features without owner approval.

## 3. Module catalogue
Status: ✅ built & tested · 🟡 partial · ⬜ not started. Phase = §7.

| # | Module | Source | Phase | Status |
|---|---|---|---|---|
| **A. Identity & trust** |||||
| A1 | Registration & onboarding (country, document, phone OTP, photo, email & username, Family ID) | §28, §29, sitemap 01 | 1 | 🟡 (email/password only) |
| A2 | Digital ID, Family ID, Smart QR & scanner | §24, v2 §17 | 1 | ⬜ |
| A3 | Family Passport (shareable identity card, selectable fields) | v2 §17 | 1 (card) → 3 (relationship info) | ⬜ |
| A4 | My Identity hub (6 dimensions, section & field privacy, preview as others, completion) | §33 | 1 (personal + privacy) → 3 (professional) | 🟡 (field privacy API) |
| A5 | Profile photo (capture/upload/editor) | §29 | 1 | ⬜ |
| A6 | Identity check (provider) & document rules | §28 | 1 | ⬜ |
| A7 | Privacy Center & Trust Center (audiences, blocks, sessions, export, deletion, reports, appeals) | v2 §22, sitemap 18 | 1 → 2 | 🟡 (blocks, field privacy API) |
| A8 | Verification Center & FN VERIFIED BADGE (admin-only) | §30.18, v2 §8 | 1 (centre) → 5 (public figures) | ⬜ |
| A9 | Admin platform (7 roles) | v2 §23, sitemap 19 | 1 → 7 | ⬜ |
| **B. Relationships** |||||
| B1 | Relationship engine (types, validation, kinship, verification) | §4, RELATIONSHIP_ENGINE.md | 1 | ✅ |
| B2 | Relationship graph & How Are We Connected? | §4, v2 §4 | 1 | ✅ |
| B3 | Connection requests (message, cancel, report), REMOVED + history | §24, v2 §4 | 1 | 🟡 |
| B4 | Family invitations, people directory, shared connections | v2 A, sitemap 03/13 | 1 → 2 | ⬜ |
| **C. Communication & community (Phase 2)** |||||
| C1 | Social feed, posts, comments, reactions, sharing, follow | v2 §6, sitemap 06 | 2 | ⬜ |
| C2 | Communities & family communities (roles, invitations, join requests) | v2 §5, sitemap 07 | 2 | 🟡 (tables) |
| C3 | Messages (1:1, groups, media) | sitemap 08 | 2 | ⬜ |
| C4 | Translation / multilingual communication | v2 §21, phase list | 2 | ⬜ |
| C5 | Notifications (centre, preferences, quiet hours, push) | §7, sitemap 17 | 2 | 🟡 (engine tiers) |
| C6 | Global search & Discover | v2 §25, sitemap 05 | 2 | 🟡 (name search) |
| **D. Family life** |||||
| D1 | Family events & Family Reunion | v2 §12–13 | **PROPOSED 2** | ⬜ |
| D2 | Family Organizer | additions 3.0 | **PROPOSED 2** | ⬜ |
| D3 | Family Memories | v2 §15 | **PROPOSED 3** | ⬜ |
| D4 | Life Timeline & My Life Map | v2 §14, additions 3.0 | **PROPOSED 3** | ⬜ |
| D5 | Family History, Family Legacy & My Legacy Story | v2 §16, additions 3.0 | **PROPOSED 3** | ⬜ |
| D6 | Family Knowledge | additions 3.0 | **PROPOSED 3** | ⬜ |
| D7 | Family Vault & Family Documents | sitemap 15, additions 3.0 | **PROPOSED 3** | ⬜ |
| D8 | Global Family Map | v2 §18 | **PROPOSED 3** | ⬜ |
| **E. Professional & business (Phase 3)** |||||
| E1 | Professional identity & multiple roles | §32 | 3 | ⬜ |
| E2 | Companies / organizations / business accounts & affiliation confirmation | v2 §20, §32 §8 | 3 | ⬜ |
| E3 | Jobs | phase list | 3 | ⬜ (needs specification) |
| E4 | Mentoring | phase list | 3 | ⬜ (needs specification) |
| E5 | Business Partner Finder | additions 3.0 | 3 | ⬜ |
| E6 | Startup Hub | additions 3.0 | 3 | ⬜ |
| **F. Commerce (Phase 4)** |||||
| F1 | Payment infrastructure & earnings ledger | §34 §8, §17 | 4 (first) | ⬜ |
| F2 | FN Market, Official Store, Creator/Celebrity/Business/Service stores | §34 §5–8 | 4 | ⬜ |
| F3 | FN Bookings | §34 §12 | 4 | ⬜ |
| F4 | Academy (digital courses, educational sessions) | phase list, §34 §5 | 4 | ⬜ (needs specification) |
| F5 | Tickets (events, paid live) | phase list, §34 §3B | 4 (events) / 5 (live) | ⬜ |
| F6 | FN Premium & subscriptions | v2 §24, §34 | **PROPOSED 4** | ⬜ |
| **G. Media, creators & broadcasting (Phase 5)** |||||
| G1 | Family Videos | v2 §7 | **PROPOSED 3** (with memories) | ⬜ |
| G2 | Public Videos | v2 §7 | **PROPOSED 5** | ⬜ |
| G3 | Celebrity profiles, interview requests, Celebrity Studio | §30, v2 §8–10 | 5 | ⬜ |
| G4 | FN Interview Studio | additions 3.0 | 5 | ⬜ |
| G5 | Live streaming (eligibility, moderation, recording consent) | §30, v2 §11 | 5 (after safety stack) | ⬜ |
| G6 | FN Webinars | additions 3.0 | 5 (needs live engine) | ⬜ |
| G7 | Live monetization: gifts, FN Coins, memberships, paid live, live shopping, sponsored live | §34 §3, §10 | 5 | ⬜ |
| G8 | Creator & celebrity earnings dashboards, payouts | §34 §4, §14 | 5 | ⬜ |
| G9 | FN Ads & Partnerships / collaboration marketplace | §34 §11 | 5 | ⬜ |
| G10 | FN Originals | §34 §13 | 5 → 7 | ⬜ |
| **H. Intelligence & protection (Phase 6)** |||||
| H1 | Family AI (relationship, history, event, media assistants) | v2 §21, sitemap 12 | 6 | ⬜ |
| H2 | Reputation | phase list | 6 | ⬜ (needs specification) |
| H3 | Protection (fraud, abuse detection, moderation automation with human review) | v2 §22, §34 §16 | 6 (base in every phase) | 🟡 (rate limits, audit) |
| H4 | Smart services | phase list | 6 | ⬜ (needs specification) |
| **I. Global (Phase 7)** |||||
| I1 | Global expansion & localisation (Kurdish, more markets) | §1, v2 §29 | 7 | ⬜ |
| I2 | Travel | phase list | 7 | ⬜ (needs specification) |
| I3 | Analytics (platform & creator, real data only) | v2 §10, §34 §14 | 7 | ⬜ |
| I4 | Integrations | phase list | 7 | ⬜ (needs specification) |
| I5 | Mobile apps (Flutter) & store deployment | §16, v2 §28 | 7 (PROPOSED: start earlier, see Q6) | ⬜ |

## 4. Shared building blocks (no duplicates)
| Building block | Used by | Rule |
|---|---|---|
| Identity (users, profiles, identifiers, stewards) | everything | one record per person |
| Relationship engine & graph | network, feed audiences, notifications, AI, partner finder | facts stored once, kinship derived |
| **Audience model** PUBLIC · CONNECTIONS · FAMILY · SELECTED · ONLY_ME · COMMUNITY | edges, fields, identity sections, posts, videos, events, roles, stores | one implementation, enforced server-side |
| Media storage (object storage + signed URLs) | photos, memories, videos, documents, products | separate strict bucket for identity/verification documents |
| **Scheduling & availability** | interview requests, bookings, events, webinars, reunions | one engine, UTC storage, local display |
| **Live session engine** (types: broadcast, interview, webinar, paid session, reunion stream) | live, Interview Studio, webinars, paid live | provider-based, replaceable |
| **Ledger & payments** | stores, bookings, tickets, gifts, coins, memberships, ads, premium, payouts | double-entry, integer minor units, idempotent |
| Notifications | all modules | engine tiers + preferences, quiet hours, dedupe |
| Moderation, reports, appeals, audit | all user content and money | humans decide serious cases |
| Organizations | business accounts, affiliations, stores, startups, ads | managed by multiple user accounts, never a "second person" |
| Timeline entries | life timeline, family timeline, history, My Life Map | one model, scoped, per-entry audience |
| Digital ID card component | Digital ID, Family Passport, My Identity overview | one component, selectable fields |

## 5. Cross-cutting rules
### 5.1 Privacy & minors
Field- and section-level audiences; preview-as-others uses the real API; data minimisation; exports and deletion;
minors: never searchable, never above FAMILY, no unions, no live broadcasting, no gifts/coins/purchases without parental
permission, no stores.
### 5.2 Security
httpOnly cookie sessions (pending G1), MFA for admins and sellers with payouts, rate limits, anti-enumeration,
audit logs (append-only for verification and money), encryption at rest for sensitive data.
### 5.3 Money
Payments only through a licensed marketplace payment provider (the platform does not hold customer funds itself —
otherwise an e-money/payment licence is required in the EU); seller KYC/KYB through the provider; full fee breakdown
before acceptance; configurable commissions (test defaults in §34 §9); gross ≠ platform revenue ≠ profit.
### 5.4 Verification kinds (independent)
| Kind | Who decides | Visible as |
|---|---|---|
| Relationship confirmed | both sides (distinct people for sensitive facts) | edge status |
| Identity check (provider) | verification provider | private status, used for eligibility |
| FN VERIFIED BADGE | human Verification Administrator | official blue badge + click text (ar/en) |
| Public figure category | administrator | badge category |
| Professional qualification | review against authoritative source | qualification label |
| Organization affiliation | authorized organization representative | "confirmed by organization" |
| Organization verification | administrator | organization badge |
| Seller / business verification | payment provider KYC/KYB + platform review | seller status (not a badge) |
| Self-declared | nobody | no verification label |

## 6. Decisions register
| # | Decision | Status |
|---|---|---|
| ADR-1…10 | Architecture decisions (PostgreSQL + in-process engine, pure engine package, canonical types, derived kinship, append-only verification, stewards, families as communities, JWT prototype, Cytoscape, typed i18n) | approved — `PROJECT_ARCHITECTURE.md` §5 |
| D-design | Modern Luxury / Editorial Minimalism; contrast-safe ink/line variants | ✅ implemented (R1.0) |
| D-name | Brand FAMILY NETWORK (folder/package names unchanged) | ✅ |
| D-video | Only Public Videos and Family Videos | ✅ rule |
| D-badge | Badge only by human administrators | ✅ rule |
| D-phases | 7-phase order from the owner (2026-11-26) replaces the 8 releases of v2 | ✅ adopted here |
| G1–G8 | Sessions, phone, identity check, photos/storage, Family ID, relationship removal, admin app, audiences | ⏸ waiting for owner |
| G9–G12 | New gates (§9) | ⏸ waiting for owner |

## 7. Phase plan 3.0
| Phase | Scope | Exit criteria (summary) |
|---|---|---|
| **1 Identity, registration, relationships, QR, privacy** | A1–A9 (A3/A4 base), B1–B4 — detailed increments R1.0–R1.10 in `FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md` §9 | §24.12, §28.7, §29.6 acceptance tests; badge only by admin; no private data in APIs/search |
| **2 Communication & community** | C1–C6; PROPOSED: D1 events & reunion, D2 organizer | post audiences enforced; messaging authorization; translation consent; notifications respect preferences |
| **3 Professional & business identity** | E1–E6, A4 professional/social/education sections; PROPOSED: D3–D8 family life, G1 Family Videos | §32 & §33 acceptance tests; family videos never public |
| **4 Commerce** | F1 ledger & payments first, then F2–F6 | every transaction in ledger; refunds/disputes; fee breakdown; legal/tax review per market |
| **5 Broadcasting, creators, earnings, collaboration** | G2–G10 (live only after moderation, reporting, emergency controls) | §30 & §34 acceptance tests; no fabricated metrics |
| **6 Family AI, reputation, protection, smart services** | H1–H4 | AI suggestions only; reputation rules approved (G12) |
| **7 Global expansion** | I1–I5 | security audit, performance, accessibility, store releases |

Current position: **Phase 1, increment R1.0 done**; R1.1+ wait for gates.

## 8. Data architecture (domains)
Existing and Phase 1–3 tables: see `FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md` §7. Additions for 3.0:

| Domain | Tables (planned) |
|---|---|
| Commerce | `payment_accounts` (provider refs, KYC status) · `ledger_accounts` · `ledger_entries` (double-entry, minor units, idempotency key) · `payments` · `refunds` · `disputes` · `payouts` · `commission_rules` · `tax_records` |
| Stores | `stores` (type: official/creator/celebrity/business/service) · `products` · `product_variants` · `product_media` · `inventory` · `carts` · `orders` · `order_items` · `shipments` · `reviews` |
| Coins & live money | `coin_wallets` (non-withdrawable) · `coin_purchases` · `gifts` · `gift_transactions` · `memberships` · `membership_tiers` · `tickets` |
| Bookings & academy | `services` · `availability_slots` (shared scheduling) · `bookings` · `courses` · `course_modules` · `enrollments` |
| Ads & partnerships | `advertisers` · `campaigns` · `campaign_offers` · `sponsored_content` · `campaign_payments` |
| Originals | `productions` · `rights_agreements` · `contributors` · `revenue_reports` |
| Business & startups | `organizations` · `organization_admins` · `startup_profiles` · `partner_finder_profiles` (opt-in) · `jobs` · `mentoring_offers` |
| Family life | `family_tasks` / `family_lists` (Organizer) · `knowledge_entries` · `legacy_items` (+ stewardship) · `vault_documents` |
| Live engine | `live_sessions` (type) · participants · moderators · chat · reports · moderation actions (from §30) |

## 9. Approval gates
G1–G8: see master implementation plan §11 (sessions, phone, identity check, photos/storage, Family ID, relationship
removal, admin app, audiences). New:

| Gate | Decision | Recommendation |
|---|---|---|
| **G9** | Payment model: licensed marketplace PSP (e.g. Stripe Connect, Adyen for Platforms, Mangopay) vs. own licence | Use a marketplace PSP; platform never holds customer funds |
| **G10** | FN Coins legal classification (prepaid digital credit, non-refundable/refundable, minors) | Legal review before build; disabled for minors |
| **G11** | Translation provider for private messages/posts (third-party processing of private content) | Opt-in per conversation, EU-hosted provider, DPA |
| **G12** | Reputation system scope (scores about people are sensitive profiling under GDPR/DSA) | Specify first; prefer transparent, contestable signals (e.g. verified reviews on transactions) over a global person score |

## 10. Open questions for the owner
- **Q1** Phase placement of family life modules (events, reunion, organizer, memories, timeline, history, legacy, knowledge, vault, map) — not in the 7-phase list. Proposed: events/reunion/organizer → Phase 2, the rest → Phase 3.
- **Q2** The full list of the other accepted suggestions, and the five that were deleted — only ten additions reached this repository.
- **Q3** Definitions for Jobs, Mentoring, Academy, Reputation, Smart services, Travel, Integrations (names only so far).
- **Q4** Video placement: proposed Family Videos → Phase 3, Public Videos → Phase 5.
- **Q5** Interview Studio vs Celebrity Studio: proposed split (production tool vs management dashboard) — confirm.
- **Q6** Flutter mobile apps: start in Phase 2–3 (recommended, camera/QR flows are mobile-first) or Phase 7?
- **Q7** Answers to gates G1–G12.

## 11. Document map
| Document | Role |
|---|---|
| **This file** | single reference: rules, modules, phases, decisions, open questions |
| `CLAUDE.md` | session instructions + section summaries |
| `FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md` | inventory, conflicts, DB, screens, Phase 1 increments, acceptance tests, gates G1–G8 |
| `PROGRESS_REPORT.md` | status, test evidence, change log |
| `specs/*.md` | full original specifications (appendices) |
| `design/*.md` | design system |
| `PROJECT_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `RELATIONSHIP_ENGINE.md`, `SECURITY_AND_PRIVACY.md` | technical documentation of what is built |

### Appendix index (`docs/specs/`)
APP_SITEMAP (§27) · SMART_IDENTITY_REGISTRATION (§28) · PROFILE_PHOTO (§29) · VERIFIED_ACCOUNTS_AND_LIVE (§30) ·
MASTER_EXPANSION_V2 (§31) · PROFESSIONAL_IDENTITY (§32) · MY_IDENTITY (§33) · MONETIZATION_COMMERCE (§34) ·
APPROVED_ADDITIONS_3_0 (§35). Sections §1–26 live in `CLAUDE.md`.
