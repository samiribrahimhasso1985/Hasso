# EZIDNET — Development Roadmap (v1.1)

Ten phases from the master plan, mapped to what already exists. Each phase ends with tests, documentation and owner
approval before the next starts.

| Phase | Scope | Already done | Remaining |
|---|---|---|---|
| **1 Foundation & architecture** | repository, docs, stack, design system, CI | monorepo, engine, DB schema, design tokens, CI workflow, docs v1.1 (this set) | approval of decisions EZ-1…EZ-10; Supabase setup (dev project, no cost); rebrand to EZIDNET; Kurmanji i18n scaffold; Soft Gold token |
| **2 Registration, identity, profiles** | Supabase Auth, profile, photo, EZID ID, QR, field privacy, Art. 9 consent | profiles, field privacy, stewards | Supabase Auth migration, EZID ID, QR tokens & scanner, photo upload (Storage), consent records, onboarding screens |
| **3 Relationship graph & people discovery** | requests, confirmation, graph, How Are We Connected?, search, Family Circles | engine, graph UI, requests/inbox, path finder, basic search | request message/cancel/report, REMOVED + history, Family Circles, opt-in discoverability, Kurmanji kinship labels |
| **4 Privacy, administration, testing** | privacy center, blocks, export/deletion, admin dashboard, full test pass | blocks API, audit log, 96 tests | privacy center UI, export, deletion, admin app (roles, MFA), security review, DPIA support documents |
| **5 Public website & PWA release** | landing page, PWA, deployment | — | landing, manifest/service worker, staging + production (after approval and domain purchase approval), legal texts |
| **6 Social & community** | feed, messages, notifications, communities, events, circles features | — | per `SCREEN_MAP.md` |
| **7 EZID Kids** | kids area, content pipeline, games, stories, parental control center, Kids AI (optional) | architecture & data model (this set) | see `EZID_KIDS_SPECIFICATION.md` §9 |
| **8 Heritage, business, creator, knowledge** | heritage & oral history, market, creator (2 video sections), academy, AI services | — | each module specified before build |
| **9 Android & iOS** | apps on the same API and types; Kids standalone app option | — | technology choice (Flutter vs React Native/Expo) at that time |
| **10 Global expansion** | more languages (e.g. Kurmanji Arabic script), scaling, partnerships | — | — |

## Status (2026-11-26)
| Done | Tests |
|---|---|
| EZIDNET branding; Kurmanji (`ku`) in engine, API and UI (draft for native review); Soft Gold token | engine 54, web 12 |
| EZID ID for every account holder (`EZ-` + 8 random digits, migration + backfill) | API 34 |
| Personal/temporary QR tokens (hash lookup, AES-GCM at rest, regenerate, revoke, expire, on/off, scan log, uniform errors, rate limit) + My digital identity panel + `/c/<token>` scan page → connection request only | API + e2e 6 |
| Not discoverable by default; opt-in toggle | API |
| Security: Next.js 14 → 15.5.29, React 19.3.1 (critical advisories resolved) | all suites green |
| **Open:** Supabase/Next.js backend (EZ-2/3), camera scanner, request message/cancel/report, Family Circles, privacy center, admin, PWA | — |

## MVP = Phases 1–5
Registration/login · profiles · digital identity · EZID ID · QR · relationship engine · requests & confirmation ·
people search · privacy & permissions · basic admin · 4 languages · responsive website + PWA.

## Recommended order inside the MVP (smallest reviewable steps)
1. Approvals (DECISIONS.md) → 2. Supabase dev project + Auth migration → 3. rebrand + `ku` i18n → 4. EZID ID + QR →
5. requests improvements + Family Circles → 6. privacy center + export/deletion → 7. admin basic → 8. PWA + landing →
9. security review + DPIA documents → 10. staging deployment (after approval).

## Kids preparation inside the MVP (no Kids features shipped yet)
Guardian/child data model reviewed · consent texts drafted · content review group formed · first content inventory
(lessons, stories, alphabet audio) prepared by the community.
