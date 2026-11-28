# EZIDINET — Expansion Proposal v1.2 (for owner approval)

Date: 2026-11-27 · Status: **PROPOSAL — no expansion module is implemented until the owner approves** (owner's rule:
"First update the documentation, screen map, database architecture and roadmap. Present the proposed changes for
approval before implementing the expansion modules.")

Source texts (verbatim): `specs/EZIDINET_V1.2_APPROVED_SCOPE.md` — Approved Expansion Scope v1.2, Smart Profile Ads,
Open Community Participation. Official project name: **EZIDINET** (UI renamed; see EZ-18 for the domain question).

## 1. Consolidation map (nothing approved is removed)
| v1.2 area | Coherent module | Document |
|---|---|---|
| Digital Museum, Sound Heritage, 3D Heritage, Cultural Preservation, AI Cultural Researcher | **Heritage** (one content/rights/review model, five faces) | `EZIDINET_HERITAGE.md`, `EZIDINET_DIGITAL_MUSEUM.md`, `EZIDINET_SOUND_HERITAGE.md` |
| WORLD, community maps, international cooperation, institutions directory, Open Community Participation (Community Hub, Ideas, Volunteers, Local) | **WORLD** | `EZIDINET_WORLD.md` |
| Community Pulse | **Pulse** (aggregates only) | `EZIDINET_COMMUNITY_PULSE.md` |
| Welcome | **Welcome** | `EZIDINET_WELCOME.md` |
| Emergency Support | **Emergency Support** (verified organizations) | `EZIDINET_EMERGENCY_SUPPORT.md` |
| Festival Network | **Festivals & Events** | `EZIDINET_FESTIVAL_NETWORK.md` |
| Kids: 14 modules | **EZIDINET Kids** (Kids World shell + modules) | `EZIDINET_KIDS_SPECIFICATION.md`, `EZIDINET_KIDS_GAMES.md`, `EZIDINET_KIDS_SAFETY.md` (+ v1.1 detail in `ezidnet/`) |
| 7 AI services | **AI Ecosystem** (6 services; Cultural Researcher + Heritage Research merged) | `EZIDINET_AI_ECOSYSTEM.md` |
| Freelance | **Freelance** (mode of the existing profile) | `EZIDINET_FREELANCE.md` |
| Smart Profile Ads | **Listings & Smart Profile Ads** (part of Market, Module 34) | §3 below |

Still excluded and not renamed: My Digital Passport · My Proof · Project Hub · Company Directory · FN Magazine ·
My Video Archive · Friends Videos. Two possible overlaps were checked:
* *Open Community projects* ≠ *Project Hub*: projects are community initiatives inside WORLD (owner's own Open Community
  specification), not a separate "Project Hub" product. ⚠ Please confirm (EZ-25).
* *WORLD institutions directory* ≠ *Company Directory*: only non-commercial institutions; businesses only via their own
  storefront (EZ-19).

## 2. Screen map additions (adult area)
| Area | Screens | Phase |
|---|---|---|
| WORLD | WORLD home · Institutions (opt-in, verified) · Institution page · Community map (institutions & events only) · Projects (Community Hub) · Project page · Create/manage project · Applications · Tasks & milestones · Updates · Ideas · Volunteer · Local · Reports & appeals | C1 / C4 |
| Pulse | Pulse home · Region view · "How these numbers are made" | C4 |
| Welcome | Welcome home · Country guide · Find a guide · Volunteer as guide · My requests | C1 |
| Festivals & Events | Festival calendar · Festival page · Events list/map · Event page · Create/manage event · My events | C1 |
| Emergency | Emergency home (local emergency number) · Verified organizations · Request help · Appeals · Crisis banner | C6 |
| Heritage | Heritage home · Museum · Collection · Item · Sound · Player/transcript · 3D/360 viewer · Timeline · Contribute · My contributions · Review queue · Corrections/takedown | H1–H2 |
| Market / Smart Profile Ads | Public profile `/profile/{slug}` (listing opened first with `?listing=`) · Business storefront `/business/{slug}` · Create listing · My listings · Ads manager (business, paid) · Report listing | M1–M2 |
| Freelance | Freelance settings · Services · Opportunities · Proposals · Engagement space · Portfolio · Reviews | F1 |
| AI | Assistant · Translator · Heritage Research · Event helper · Learning Path | AI1–AI2 |
| Admin (role-based) | Institution verification · Special-review queue (fundraising, emergency, children, sensitive data, high-risk events) · Moderation & appeals · Heritage review & rights · Listings moderation & fraud · Teachers verification (Kids Classroom) · Crisis mode · AI spending & logs | with each module |

Kids area additions: Kids World home · Story Maker · My Companion · Little Speaker · Kids Classroom (child view) and in
the Parental Control Center: content approval per category/item · classroom invitations · Companion/AI settings ·
recording permissions.

Navigation: bottom bar stays Home · My Network · Discover · Messages · Profile; the new modules live under **More
Services** grouped as *Community* (WORLD, Pulse, Welcome, Festivals, Emergency), *Heritage*, *Work & Market*
(Freelance, Market), *Learning* (Kids entry for guardians, AI Learning Path).

## 3. Smart Profile Ads — design
* **Listing** (owner's mandatory fields): `listing_id`, `owner_user_id` → real EZIDINET account, `owner_type`
  (`PERSONAL` | `BUSINESS`), `listing_type` (product · service · rental · job-related · other), `title`, `description`,
  `price` (decimal, nullable for "on request"), `currency` (ISO 4217), `condition` (new · used-like-new · used · for parts
  · n/a), `availability_status` (available · reserved · sold · paused), `media_assets` (→ `listing_media`),
  `location_visibility` (`HIDDEN` · `COUNTRY` · `CITY`), `publication_status` (draft · pending_review · published ·
  rejected · removed · archived), `created_at`, `updated_at`. Plus `business_id` when owner_type = BUSINESS.
* **No duplicate profiles:** a personal listing uses the person's existing profile. A business storefront is a
  `business_profiles` row **owned by** an existing account (with optional team members) — never a second person account.
* **Routes:** `/profile/{public_profile_slug}?listing={listing_id}` and `/business/{public_business_slug}?listing=…`.
  Slugs are random-suffixed or user-chosen, never contain the EZID ID, phone or email.
* **Ad = promotion of a listing:** `ad_campaigns` reference `listing_id`; clicks are logged as aggregate counters with
  the original attribution preserved; no cross-site tracking, no third-party ad networks, no profiling on religion,
  ethnicity, health or other special categories; **no ads in the Kids area or for under-18 accounts**.
* **Privacy:** the public profile page renders only fields whose audience is PUBLIC; never private messages, identity
  documents, private family relationships, phone numbers or hidden fields. Contact = message request according to the
  owner's messaging settings.
* **Business rules:** Personal Sale free (personal-use limits, e.g. max active listings, proposed 20); business
  storefront advertising via paid plans (Module 34, later); automatic + human classification check (a "personal"
  seller with many repeated listings is asked to switch to business); moderation and fraud prevention for both
  (prohibited-items list, price-anomaly flags, reports, seller rate limits).
* ⚠ **Interaction with "not discoverable by default" (EZ-24):** a public profile page does not exist until the member
  turns it on (explicit confirmation showing exactly which fields become public). Publishing a public listing asks to
  turn it on; a member can also sell with a business storefront only.

## 4. Database architecture (planning — no migration yet)
All new tables reference the existing `users`/`profiles`; relationships stay in the relationship graph tables; no
module duplicates people or relationships.

| Module | Planned tables |
|---|---|
| Shared | `media_assets` (exists in plan), `institutions`, `institution_representatives`, `institution_verifications`, `moderation_actions`, `appeals`, `special_reviews`, `consents` (generic consent records: subject, scope, granted_by, withdrawn_at) |
| Heritage | `heritage_items`, `heritage_collections`, `heritage_media`, `heritage_sources`, `heritage_rights`, `heritage_consents` (→ `consents`), `heritage_reviews`, `heritage_corrections`, `heritage_transcripts` |
| WORLD / projects | `projects`, `project_members`, `project_applications`, `project_tasks`, `project_milestones`, `project_updates` |
| Pulse | `pulse_snapshots` (aggregates only, no personal IDs) |
| Welcome | `country_guides`, `guide_sections`, `guide_reviews`, `welcome_volunteers`, `welcome_requests` |
| Emergency | `help_requests` (encrypted payload), `help_request_events`, `emergency_appeals`, `crisis_modes` |
| Festivals & events | `events`, `event_hosts`, `event_attendees`, `event_updates`, `festival_definitions`, `festival_dates` |
| Market / ads | `business_profiles`, `business_members`, `public_profile_pages` (slug, enabled, fields shown), `listings`, `listing_media`, `ad_campaigns`, `ad_daily_stats` (aggregates), `listing_reports` |
| Freelance | `freelance_settings`, `freelance_services`, `freelance_jobs`, `freelance_proposals`, `engagements`, `engagement_reviews`, `portfolio_items` |
| Kids (additions to v1.1 13-table model) | `kids_stories` (Story Maker, private), `kids_recordings` (Little Speaker, retention), `classrooms`, `classroom_teachers`, `classroom_members`, `classroom_assignments`, `content_approvals` (per guardian), `companion_settings` |
| AI | `ai_requests_log` (retention-limited, no message bodies for private data), `ai_spend` |

Constraints planned: enums as PostgreSQL enums; `listings.owner_type = 'BUSINESS'` ⇒ `business_id NOT NULL`;
`price >= 0`; currency CHECK `^[A-Z]{3}$`; special-review gating enforced in the service layer and by a
`status` CHECK (feature cannot be `ACTIVE` without an approved `special_reviews` row); encrypted columns for help
requests; row-level authorization in services (and RLS if Supabase is adopted, EZ-2).

## 5. Roadmap & budget (proposal, €5,000 ceiling)
The MVP (Phases 1–5 in `ezidnet/ROADMAP.md`) stays first. Expansion modules follow in small, separately approved steps,
cheapest/highest-value first:

| Step | Scope | Main cost driver |
|---|---|---|
| C1 | Welcome (guides, volunteer guides) · Festivals & Events · Open Community projects (ordinary) | development only |
| M1 | Public profile pages + Personal Sale listings + Smart Profile Ads routing (no payments) | development, moderation time |
| H1 | Heritage core: Museum (photos/documents) + Sound (upload, consent, player, manual transcripts) + review workflow | storage (small), reviewers' time |
| C4 | WORLD institutions + verification · Pulse snapshots | development |
| F1 | Freelance (no payments) | development |
| K1–K3 | EZIDINET Kids (after legal review and content preparation) | **content production + legal review** |
| C6 | Emergency Support (after legal review, verified partners) | legal review |
| AI1 | Translator + Assistant search (spend cap) | API usage |
| M2 | Business storefronts, paid plans, ads manager (needs payment provider + tax/legal) | provider fees, legal |
| H2 / AI2 / K5–K6 | 360°/3D heritage, Heritage Research, Kids Classroom, Kids/Companion AI | partners, legal |

Indicative budget split (estimates to verify, nothing purchased): legal reviews (DPIA, privacy texts, kids consent,
emergency liability) ≈ largest share · hosting/database/storage for the soft launch ≈ low monthly amount · domain ≈ small
yearly fee (after EZ-18) · AI usage with a hard monthly cap · reserve for security review. Exact figures will be
proposed with real provider quotes before any purchase.

## 6. API architecture (planning)
REST modules mirror the table groups: `/world/*`, `/projects/*`, `/pulse/*`, `/welcome/*`, `/emergency/*`,
`/events/*`, `/heritage/*`, `/listings/*`, `/business/*`, `/profile-pages/*`, `/freelance/*`, `/kids/*`, `/ai/*`,
`/admin/*`. Every endpoint: authentication, authorization by role + audience rules, rate limits, audit for
administrative actions, uniform 404 for hidden objects (as already implemented for graph and QR).

## 7. Permissions & roles (additions)
Member · Project organizer / project admin · Institution representative · Verified aid organization responder ·
Heritage contributor / reviewer / rights reviewer / editor · Welcome guide · Teacher (Kids Classroom) · Seller (personal) ·
Business owner / business member · Moderator · Special-review officer · Administrator (MFA). Roles are scoped (per
project, per institution, per business, per classroom), never global by default.

## 8. Localization, security, admin, testing
* Localization: all new modules in ku (Latin), ar, de, en; `ku-Arab` before launch in Iraq/Syria (EZ-15); heritage
  metadata supports multiple language versions per item; currency and number formatting via `Intl`.
* Security: discreet mode and at-risk protections (EZ-17) apply to all modules; aggregates and maps never expose
  members; special-category data (help requests, testimonies) encrypted; audit logs for all admin actions.
* Admin tools: listed in §2; every decision has a reason shown to the affected member and an appeal path.
* Testing: each module document lists acceptance tests; they become integration tests (API) and e2e tests (web) when
  the module is built. Global regression: privacy filtering, uniform 404, no child exposure, no ads for minors.

## 9. Decisions requested from the owner
| # | Question | Recommendation |
|---|---|---|
| **EZ-18** | Name vs domain: UI now says **EZIDINET**; v1.1 said EZIDNET.COM. Which domain should be used (nothing purchased)? | Choose one name for both; check availability of `ezidinet.com` / `.org` before deciding; buy only after your approval |
| **EZ-19** | WORLD directory scope | Non-commercial institutions only; companies never listed (Company Directory stays excluded) |
| **EZ-20** | Pulse privacy | k ≥ 50, country level, suppressed in high-risk countries |
| **EZ-21** | Emergency Support | Build only after legal review; start with 1–3 verified partner organizations you name |
| **EZ-22** | Ages 13–16 | Stay in the guardian-managed Kids area; adult social area from the local legal age (16 in EU/Australia) |
| **EZ-23** | My Companion | Scripted character by default; AI conversation only with guardian-enabled Kids AI; no emotional-dependency design |
| **EZ-24** | Public profile page for Smart Profile Ads | Off by default; member turns it on explicitly (fits "not discoverable by default") |
| **EZ-25** | Open Community projects vs excluded "Project Hub" | Treat projects as part of WORLD (your Open Community spec), not as "Project Hub" — please confirm |
| **EZ-26** | Expansion order after the MVP | C1 → M1 → H1 → C4 → F1 → Kids (after legal) → C6 → AI1 → M2 → rest |
| **EZ-27** | 3D Heritage | 360° photos first; real 3D only via partners/donations |
| **EZ-28** | Personal Sale limits | Free up to 20 active listings; more → business storefront |

Approve all recommendations with one word (e.g. "موافق"), or name the numbers you want changed.
