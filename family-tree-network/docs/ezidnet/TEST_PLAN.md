# EZIDNET — Test Plan (v1.1)

## 1. Current baseline (all passing, 2026-11-26)
Engine unit 53 · API integration 26 (real PostgreSQL) · web unit 12 (layout, i18n/RTL, design tokens & contrast) ·
end-to-end browser 5 (real stack). These remain the regression suite through the migration to Supabase.

## 2. Test layers
| Layer | Tool | Runs on |
|---|---|---|
| Engine unit | Vitest | every commit (CI), Windows and Linux |
| Domain/API integration | Vitest or Jest against a Supabase local stack or test project | every commit |
| RLS policy tests | SQL tests: each role tries forbidden reads/writes | every migration |
| Web unit | Vitest + Testing Library | every commit |
| End-to-end | Playwright (real browser) | before each phase sign-off |
| Accessibility | contrast tests (exist) + axe checks | per phase |
| Security | dependency audit, auth/permission tests, manual review | Phase 4 and before release |

## 3. MVP acceptance tests
- Registration with email verification; one account = one profile; Art. 9 consent recorded before profile creation.
- EZID ID unique, non-sequential, contains no personal data.
- QR: correct profile resolved; expired/revoked tokens rejected; uniform responses; scan never creates a relationship.
- Relationship request → accept → graph updated; reject/cancel → no confirmed edge; "Proposed" label shown.
- How Are We Connected? uses confirmed edges only; "No verified connection found" otherwise.
- New profiles are **not discoverable** until opted in; search never returns hidden people or children.
- Field privacy and audiences enforced by the API (not only UI); view-as-others equals real API output.
- Export contains all own data; deletion removes personal data.
- Admin actions require MFA and are audited; non-admins cannot reach admin APIs.
- Four languages complete; Arabic RTL layout; Kurmanji characters correct.
- PWA installs; works on 390 px phones without horizontal scroll.

## 4. EZID Kids safety tests (Phase 7)
- A child profile cannot be activated without an ACTIVE guardian link and recorded consent.
- Child-scoped access can read only PUBLISHED kids content and the child's own progress; all social, messaging,
  search, market, creator and live endpoints reject it.
- No API returns a child to a non-family viewer; children never appear in search, map or public pages.
- Leaving Kids mode requires the guardian PIN; screen-time limit stops activities when reached.
- Content in DRAFT/IN_REVIEW is never shown to children; publishing requires the required approvals.
- Guardian-disabled sections and AI are inaccessible.
- Kids AI answers only from approved sources; refusal for out-of-scope questions; no personal data requested from the child.
- No advertising, tracking pixels or third-party analytics load in the Kids area (network inspection in e2e).
- Creations visible only to the child's guardians.
- Kids AI interaction logs deleted after the retention period.

## 5. Windows development check
`npm install`, `npm test` and `npm run dev` documented and verified on Windows (PowerShell) before Phase 2 sign-off.
