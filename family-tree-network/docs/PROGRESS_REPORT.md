# Progress Report — FAMILY NETWORK

Kept up to date after every phase or significant change (CLAUDE.md §26).
Last update: **2026-11-27** · Branch: `ccr-47c5f9b6-alewtl`
Primary reference: `FAMILY_NETWORK_MASTER_SPECIFICATION_3.0.md` · Phase 1 detail: `FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md`

## 1. Summary

| Area | Status |
|---|---|
| Specifications (CLAUDE.md §1–33 + `docs/specs/`) | ✅ stored; v2.0 master expansion is authoritative |
| Master implementation plan (inventory, conflicts, app map, DB, screens, phases, acceptance tests, approval gates) | ✅ written |
| **R1.0 Design system — Modern Luxury / Editorial Minimalism** | ✅ implemented and tested |
| R1.1–R1.10 (registration, identity, phone, photo, QR, requests, privacy, admin) | ⏸ waiting for approval gates G1–G8 |
| Relationship engine, graph, verification, How Are We Connected? (built earlier) | ✅ working, unchanged in behaviour |
| Phases 2–7 (owner's 7-phase order, Spec 3.0 §7) | ⬜ not started |
| Module 34 monetization & commerce, additions 3.0 | 📝 stored and placed in the phase plan (Spec 3.0) |
| Master Specification 3.0 (single reference) | ✅ written |

## 2. Work completed

### 2.1 Earlier iterations
Relationship engine (catalog, normalisation, validation, two-sided verification, kinship derivation incl. Arabic
paternal/maternal terms, path finding, visibility, ego network, notification tiers) · PostgreSQL schema with integrity
constraints · NestJS API (auth, profiles, field privacy, stewards, relationships lifecycle, graph, blocks, audit) ·
Next.js interactive graph (network & generations layouts, filters, search, expand/collapse, path highlight, inbox,
add-relationship dialog, ar/de/en, phone layout) · architecture docs · CI workflow.

### 2.2 This iteration (2026-11-26)
1. **Specs stored:** `MASTER_EXPANSION_V2.md`, `PROFESSIONAL_IDENTITY.md` (§32), `MY_IDENTITY.md` (§33);
   CLAUDE.md §31–33 summaries; §3 and §25 marked superseded.
2. **Master plan:** inventory of existing features, new features by domain, 18 reconciled conflicts/duplicates
   (e.g. video sections, Family ID prefix, visibility vocabularies, Digital ID vs Family Passport vs My Identity,
   two kinds of "identity verified"), updated app map, target database by domain, screen map, R1 increments,
   acceptance tests for R1–R8, 8 approval gates.
3. **R1.0 Design system implemented:**
   - Tokens in `apps/web/lib/tokens.ts` + CSS variables; relationship colours moved to the engine (single source).
   - Self-hosted Inter + IBM Plex Sans Arabic (no Google requests from users' browsers).
   - All screens restyled (welcome, dashboard, graph, panels, dialog, inbox, path finder); glow, neon and gradients removed;
     brand shown as **FAMILY NETWORK**.
   - Fixed while testing: welcome illustration clipped by text block; path view framed before layout finished.
   - Six design docs in `docs/design/` (DESIGN_SYSTEM, COLOR_TOKENS, TYPOGRAPHY, COMPONENT_LIBRARY, RESPONSIVE_LAYOUT,
     ACCESSIBILITY).
   - **No features removed, no data or API behaviour changed** (only the colour values returned with edges).

## 3. Test evidence (2026-11-26, after R1.0)

| Suite | Result |
|---|---|
| Engine unit tests | 53 / 53 ✅ |
| API integration tests (PostgreSQL) | 26 / 26 ✅ |
| Web unit tests (layout, i18n/RTL, **design tokens & WCAG contrast**) | 12 / 12 ✅ |
| End-to-end browser tests (real stack) | 5 / 5 ✅ |
| Typecheck engine / API / web, production build | ✅ |
| Visual check (desktop ar/en, phone 390 px) | ✅ screenshots reviewed; no horizontal scroll |
| CI on GitHub | ⚠ workflow present, not yet observed running |

## 4. Findings to note
- **Palette contrast:** Stone Gray (3.4:1) and Muted Terracotta (2.6:1) are below WCAG AA for small text; the four
  accent hues are below 3:1 for graph lines. Solution: same hues, slightly deeper "ink"/"line" variants
  (documented in `docs/design/COLOR_TOKENS.md`, enforced by tests). Original palette unchanged for large areas.
- **Low-saturation categories look similar.** Edges keep text labels (on by default) and the legend names each
  category; optional extra line patterns per category possible if wanted.

## 5. Open decisions (approval gates — see master plan §11)

| Gate | Topic |
|---|---|
| G1 | Cookie-based sessions + refresh rotation instead of tokens in sessionStorage |
| G2 | Phone numbers: mandatory, storage (encrypted + hash), duplicate-phone policy, SMS provider |
| G3 | Identity check policy (mandatory vs by policy), provider, who may apply for the public badge, retention |
| G4 | Object storage, mandatory profile photo, default photo audience |
| G5 | Family ID length (FN- + 6 or 8 digits), backfill of existing accounts, real domain |
| G6 | Relationship removal → REMOVED status with history and retention period |
| G7 | Separate admin app with 7 roles, MFA for admins |
| G8 | Unified audience model (adds Selected People, Community) |
| G9 | Payment model: licensed marketplace payment provider |
| G10 | FN Coins legal classification, minors |
| G11 | Translation provider for private content |
| G12 | Reputation system scope |

Open questions Q1–Q6 (placement of family-life modules and videos, missing suggestion list, definitions of jobs/mentoring/academy/reputation/travel/integrations, Interview vs Celebrity Studio, mobile timing): Spec 3.0 §10.

## 6. Risks & limitations
Web token in `sessionStorage` (G1) · no email verification / password reset / MFA yet · path search ≤ 8 hops,
family visibility horizon 4 hops (by design) · camera features need HTTPS · real SMS / identity verification require
provider contracts · graph canvas not screen-reader navigable (list view planned).

## 7. Next steps
After approval of the gates: R1.1 → R1.10 in the order of the master plan §9, each with tests and a report update.

## 8. Change log

| Date | Change |
|---|---|
| 2026-11-26 | Engine, API, database, web prototype, docs, CI (commits c5dfbd5 → 735cd7a) |
| 2026-11-26 | Spec §24–26 added; progress report created (c4625fd) |
| 2026-11-26 | Sitemap & specs §27–30 stored; first implementation plan (a2cf63b) |
| 2026-11-26 | v2.0 master expansion, §32 professional identity, §33 My Identity stored; master implementation plan (547c8d5) |
| 2026-11-26 | **R1.0 design system implemented** (Modern Luxury / Editorial Minimalism), 6 design docs, token & contrast tests (eb8358f) |
| 2026-11-26 | **EZIDNET implementation (after owner's 'continue'):** rebrand, Kurmanji 4th language (draft), Soft Gold, EZID ID, secure QR codes + scan page, not-discoverable default, Next.js 15.5.29 / React 19 security upgrade. Tests: engine 54, API 34, web 12, e2e 6 — all green. Supabase migration pending (environment blocks Docker Hub). |
| 2026-11-26 | Project book (Arabic PDF) explaining every step and why (`docs/book/`) |
| 2026-11-26 | **EZIDNET v1.1** plan received; 16 documents in `docs/ezidnet/` (vision, architecture, screens, database incl. EZID Kids model, security, localization, roadmap, tests, deployment, decisions EZ-1…EZ-13, 4 Kids documents). Waiting for approval; no code changed. |
| 2026-11-26 | Module 34 (monetization & commerce) and approved additions 3.0 stored; **Master Specification 3.0** created as single reference; 7-phase order adopted; gates G9–G12 and questions Q1–Q6 added. No code changed. |
| 2026-11-26 | Target countries answered (Q-2): `docs/ezidnet/TARGET_MARKETS.md`, decisions EZ-14…EZ-17 |
| 2026-11-27 | **Android development APK** (`apps/android`, WebView shell, debug-signed, 15 KB): built and verified (`aapt`, `apksigner`); optional same-origin API proxy in the web app (`API_PROXY_TARGET`) + `dev:lan` script; phone mode tested in a Pixel 7 emulated browser through the LAN address (login, graph, Arabic RTL, 0 page errors). Not run on a real device or emulator (no KVM here). UI renamed **EZIDINET**. |
| 2026-11-27 | **EZIDINET v1.2** expansion scope + Smart Profile Ads + Open Community Participation stored verbatim (`docs/specs/EZIDINET_V1.2_APPROVED_SCOPE.md`); 13 module documents `docs/EZIDINET_*.md`; consolidated proposal with screen map, database, API, roles, roadmap/budget and decisions EZ-18…EZ-28 (`docs/EZIDINET_EXPANSION_PROPOSAL_V1.2.md`). **Waiting for approval; no expansion module implemented.** |
| 2026-11-27 | **APK tested on emulators** (software mode, no KVM): Android 8 — install, setup screen, invalid/unreachable address handling ✅; web app needs WebView ≥ 80 (Android 8 image has 69) → update hint added. Android 14 (WebView 113) — install, splash ✅; WebView renderer crashes repeatedly under software emulation even on the bundled setup page (environment) → app bug found and fixed: renderer crash no longer kills the app (`onRenderProcessGone`), crash-loop guard after 3 crashes in 3 min (verified: exactly 3 crashes, app alive). Login inside the APK not yet verified — needs a real phone. |
| 2026-11-27 | **EZIDINET Desktop** (`desktop/`, Electron): whole platform on one computer — embedded PostgreSQL 17, API, Next.js standalone, demo data on first start; DB/API bound to 127.0.0.1, optional phone sharing; per-install secrets; crash recovery. Builds: Windows ZIP + portable EXE, Linux AppImage. Tests: runtime 8/8, Electron window 5/5 (sources and packaged Linux build). Security fix found by the tests: API can now be bound to one interface (`HOST`). Windows build not run on Windows yet. |
| 2026-11-27 | **Public website** (`website/`): static page in ku/ar/de/en, RTL, light/dark, phone/desktop, self-hosted fonts, 0 external requests; private preview published as artifact. Not hosted publicly yet (needs approval, domain, Impressum/privacy pages). |
| 2026-11-27 | **Complete registration & sign-in**: 3-step registration (account · country only · three recorded consents: terms/privacy, GDPR Art. 9, minimum age 16 — draft texts), password rules + strength guide, e-mail verification (single-use 24 h links, hashed), forgot/reset password (1 h, uniform answer, signs out all devices, rejected password keeps the link), lock after 5 failures for 15 min per address (no account enumeration), server-side sessions (logout really ends access, logout everywhere, session list), change password. Developer mailbox while no e-mail provider exists. Migration `auth_complete`. Tests: API 49, web 16, e2e 7 (full account journey at phone width in Arabic). Website: Create account button. Open: e-mail provider choice, legal texts, Q-4 minimum age confirmation. |
| 2026-11-27 | **Owner decision:** EZIDINET Desktop removed (`desktop/` deleted; history stays in Git). Website and platform merged into one address: `/` = website, `/app` = platform (sign in / create account), the Android app opens the same address. Website buttons lead to `/app` and `/app?mode=register`. Tests: e2e 8 (new: home page → sign in / create account). |
| 2026-11-27 | **Online test server prepared** (owner approved publishing): `render.yaml` Blueprint (Frankfurt, free plans), build/start scripts, developer mailbox protected by `OUTBOX_KEY` online. Render API key route failed (401 with every key saved), so publishing is done by the owner with *New → Blueprint* — `docs/DEPLOY_RENDER.md`. Verified locally with the same scripts on a fresh database. API tests 50. |
| 2026-11-28 | **Online test server live:** owner deployed the Blueprint (database ezidinet-db + service ezidinet, Frankfurt, free). Checked from outside: `https://ezidinet.onrender.com/` serves the website, `/api/health` answers `ok` through the proxy. Android app 0.2.0 opens this address by default (setup screen only for another server). |
| 2026-11-28 | **Profile photos**: take or choose a photo, drag/zoom square crop, saved as 512×512 JPEG; shown in the graph, person panel and top bar. Privacy per photo (connections by default; public / family / only me; minors never beyond family); signed links valid 1–2 h; EXIF/GPS and PNG text chunks removed server-side; content-checked JPEG/PNG only, 2 MB max. **Decision for approval:** photos stored in their own table (`profile_photos`) during the test phase instead of object storage (§29) — movable later. Tests: API 57, web 18, e2e 9. |
| 2026-11-28 | **EZIDINET WORLD preview** at `/world` (not on the home page until approved): three.js scene built in code — Digital Earth of 4,718 connected land points (Natural Earth, public domain) with grid, atmosphere, orbit rings and moving lights; procedural Sinjar ridge with mist; Tree of Life (trunk, 5 limbs, glowing roots) growing in sequence and linked to the Earth; arcs from Sinjar to 34 places (draft list for community review, no numbers); place cards, communities by country (empty state, no invented data), heritage list; 4 languages; low-detail mode, lazy loading, pauses when hidden, reduced motion, WebGL fallback. Module colours per owner spec, scoped to this page. Tests: e2e 10. |
| 2026-11-28 | **WORLD update (owner request):** Tree of Life removed (Earth now rests over the Sinjar ridge). **All 241 countries of the world** (Natural Earth 1:50m, public domain; names in en/de/ar/ku via i18n-iso-countries): thin borders on the Earth, tap any country or pick it from a searchable list → the Earth turns, the camera flies to it, a gold outline marks it and a card opens (general note where a Yazidi presence is known, the Yazidi places in that country, or an honest empty state). Tapping a place also flies close to it. Places list extended (Sharya, Aragatsotn, Bremen, Hamburg) — still a draft for community review, **no population figures** until a verified source is approved. Data: `public/world/countries.json` (232 KB, 81 KB gzip), built by `apps/web/scripts/build-world-countries.mjs`. Fixed: dimmed title stayed fully visible (animation end state). Tests: web unit 18, e2e 10/10 (WORLD test now covers Germany via list and Spain by tapping the Earth). |
