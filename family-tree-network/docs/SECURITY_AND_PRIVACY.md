# Security & Privacy

Privacy is a core requirement (spec §15). This document separates **what is implemented and tested** from
**what is required before production**.

## 1. Data we hold (prototype)

| Data | Where | Sensitivity | Default exposure |
|---|---|---|---|
| Email, password hash | `users` | high | never exposed to other users |
| Name, gender | `profiles` | medium | display name public to people who can see the profile; full name family only |
| Birth / death date | `profiles` | high | birth date FAMILY (configurable), death date shown on visible profiles |
| Country / city | `profiles` | medium | country PUBLIC, city FAMILY; **no addresses, no coordinates, no phone numbers** |
| Relationships | `relationships` | high (family facts) | per-edge visibility; family types default FAMILY |
| Decisions, audit trail | `relationship_verifications`, `audit_logs` | medium | parties only / internal |

## 2. Implemented controls ✅ (all covered by tests)

### Authentication
* bcrypt (12 rounds), constant-time-ish failure path (dummy hash), generic “email or password is incorrect”.
* JWT (HS256, 12 h); global guard — every endpoint requires auth unless explicitly `@Public()`.
* Server refuses to start without a ≥ 32-char `JWT_SECRET`, and refuses a development secret in production.
* Rate limiting: global per-client limit + **10 login/register attempts per minute** (configurable).

### Authorisation (relationship engine rules)
* Only a party or a steward may create a relationship (`NOT_A_PARTY`), decide on it (`NOT_A_CONFIRMER`), edit or delete it.
* A claimed profile is only ever represented by its owner.
* Sensitive family facts need two different users' confirmations — no single person can verify parentage or a marriage.
* Stewards can only add co-stewards who have their own account.

### Visibility & privacy
* Edge visibility PUBLIC / NETWORK / FAMILY / PRIVATE; pending/rejected claims visible only to parties.
* Field-level profile privacy with safe defaults.
* All graph algorithms run on the **viewer-filtered** graph — kinship labels, generations, paths and expand hints cannot
  reveal hidden edges (tested: a stranger sees only Omar's one public tie; a distant relative cannot discover a path
  through family-only links).
* People the viewer may not see return **404** (not 403) to avoid confirming existence.

### Children
* `is_minor` profiles: never searchable, field visibility capped at FAMILY, edges capped at FAMILY, no unions allowed,
  guardians are stewards. Tested: strangers get 404, family can view, PUBLIC settings are silently capped.

### Blocking
* Blocks hide the blocker and blocked person from each other (profiles, graph, search) and prevent new relationship
  requests (tested).

### Integrity & audit
* DB constraints and triggers (see DATABASE_SCHEMA.md §4); advisory locks against races.
* Append-only verification log; audit log for registration, login, relationship create/decide/update/delete,
  privacy changes, steward changes, blocks.
* Input validation with whitelisting (`forbidNonWhitelisted`), typed enums, length limits.
* HTTP hardening: `helmet` on the API; `X-Frame-Options: DENY`, `nosniff`, strict referrer policy on the web app;
  CORS restricted to configured origins.

### Data minimisation
* No phone numbers, addresses or precise locations collected. Demo data is fictional and refused in production.

## 3. Required before production ❗

| Area | Gap | Plan |
|---|---|---|
| Token storage | Web app keeps the JWT in `sessionStorage` (XSS-readable). | httpOnly, Secure, SameSite=Lax cookies + short-lived access / rotating refresh tokens; CSRF protection. |
| Account lifecycle | No email verification, password reset, MFA, session revocation. | Phase 1 completion: verification links (hashed tokens), reset flow, TOTP/WebAuthn MFA, `sessions` table. |
| GDPR | No self-service export / deletion yet; no consent table. | Data export (JSON of own profile, relationships, decisions); deletion with grace period → hard delete + relationship tombstones; `consents` table for AI, photo tagging, location, email. Record of processing activities; DPA with processors. |
| Encryption at rest | Relies on infrastructure. | Encrypted volumes/managed PostgreSQL encryption; application-level encryption for birth dates of minors and message bodies; KMS-managed keys. |
| Transport | Local HTTP in development. | TLS everywhere, HSTS. |
| Content security | No CSP yet. | Strict CSP with nonces in Next.js. |
| Moderation | Blocks only. | Reports, moderator roles, audit dashboard (Phase 3/7). |
| Child accounts | Managed profiles only. | Age gate at registration, parental consent flow when a minor claims a profile, transfer of stewardship at majority. |
| Abuse of relationship requests | Rate limited only globally. | Per-user request quotas, spam heuristics, “request from strangers” setting. |
| Secrets | `.env` files in development. | Secret manager; rotation. |
| Monitoring | Console logs. | Structured logs without personal data, alerting on auth anomalies. |

## 4. AI & privacy (Phase 6 rules)

* AI suggestions are stored as suggestions (`ai_suggestions`) and **never** create or change relationships automatically.
* No training on family photos or private data without explicit, revocable consent.
* AI-generated history is always labelled as unverified.

## 5. Threat model highlights

| Threat | Mitigation |
|---|---|
| Fabricated family claims (“I am X's father”) | two-sided verification by distinct users; claimed profiles only confirmed by owners; disputes |
| Stalking via relationship discovery | viewer-filtered graph; FAMILY default for family ties; minors capped; blocks; 404 for hidden people |
| Enumeration of children | minors excluded from search and public views |
| Race conditions creating duplicates | advisory locks + partial unique index (tested with parallel requests) |
| Credential stuffing | rate limiting, bcrypt, generic errors; MFA planned |
| Privilege escalation via steward | stewards cannot act for claimed profiles; can't add steward without own account |
