# EZIDNET — Decisions Log (v1.1)

Status values: ✅ carried over (already approved/implemented) · ❓ needs owner approval · ⛔ excluded by owner

## 1. Carried over from the existing project
| # | Decision | Status |
|---|---|---|
| D-1 | Relationship graph, not a hierarchical tree; one person = one node | ✅ |
| D-2 | Pure TypeScript relationship engine reused by all apps | ✅ |
| D-3 | Canonical relationship storage, derived kinship from confirmed facts only | ✅ |
| D-4 | Two-sided verification; sensitive family facts need two distinct confirmers | ✅ |
| D-5 | Guardians/curators manage unclaimed profiles (children, ancestors) | ✅ |
| D-6 | Privacy filtering before any graph algorithm; hidden people return "not found" | ✅ |
| D-7 | Only two video sections: Public Videos and Family Videos | ✅ |
| D-8 | Verified badges only by human administrators; AI never decides identity/relationships | ✅ |
| D-9 | Modern Luxury / Editorial Minimalism design system with contrast-safe tokens | ✅ |

## 2. Decisions needed for EZIDNET v1.1
| # | Question | Recommendation |
|---|---|---|
| **EZ-1** | Is EZIDNET the product built on the existing FAMILY NETWORK core (rebrand + new scope), or a separate project next to it? | Build EZIDNET on the existing core; keep FAMILY NETWORK docs as history; after approval, move EZIDNET docs to `docs/` top level |
| **EZ-2** | Backend: Next.js route handlers + Supabase (option A) or keep NestJS + Supabase (option B) | **A** — one deployable, lower cost, matches the spec |
| **EZ-3** | Replace custom login with Supabase Auth (email first, SMS later) | Approve; TOTP MFA for admins |
| **EZ-4** | EZID ID format | `EZ-` + 8 random digits (non-sequential, no personal data) |
| **EZ-5** | Discoverability default | **Off** until the person opts in (community safety) |
| **EZ-6** | Kurmanji script | Latin (Hawar) first; Arabic-script variant later if requested |
| **EZ-7** | Identity documents in the MVP | **None** — email verification only; provider-based verification later, if ever |
| **EZ-8** | Children's access model | Kids mode on guardian device (PIN), no child credentials; standalone app later with guardian-paired child tokens |
| **EZ-9** | Kids AI | Off by default per child; approved knowledge base only; built last within Phase 7 |
| **EZ-10** | Legal review budget | Reserve part of the €5,000 for DPIA, privacy policy and kids consent review before public launch |
| **EZ-11** | Soft Gold (`#C9A34F`) use | Accent for highlights/badges only (contrast ~2.2:1 on Warm Sand — never for text) |
| **EZ-12** | Kids visual identity | Separate playful-but-calm theme (rounded, larger targets, warm palette), no neon, no dark patterns |
| **EZ-13** | Mobile technology (Phase 9) | Decide later (Flutter vs React Native/Expo); API and types stay shared |

## 3. Excluded by the owner (never built, never renamed)
⛔ My Digital Passport · ⛔ My Proof · ⛔ Project Hub · ⛔ Company Directory · ⛔ FN Magazine · ⛔ My Video Archive ·
⛔ Friends Videos.

**Effect on earlier FAMILY NETWORK plans:** the *Family Passport* (FAMILY NETWORK v2 §17) is treated as the excluded
"My Digital Passport" and is dropped; the **digital identity card** (EZID ID + QR + chosen fields) remains, because
the EZIDNET plan lists Digital Identity explicitly. "Organizations" stay only as business accounts/stores — no
directory of companies.

## 4. Open questions
* Q-1 Who forms the cultural review group for heritage and EZID Kids content (names/roles)?
* Q-2 Which countries are the first target markets (affects legal review: Germany, Iraq, Armenia, Georgia, Russia, USA …)?
* Q-3 Should FN Coins / FN Originals keep the "FN" prefix under the EZIDNET brand?
* Q-4 Minimum age for an own (adult-area) account: 16 (EU default) — confirm.
