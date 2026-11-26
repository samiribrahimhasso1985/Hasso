# EZIDNET — Security & Privacy (v1.1)

Status: **proposal for owner approval**. Builds on the controls already implemented and tested
(`../SECURITY_AND_PRIVACY.md`).

## 1. Why EZIDNET needs a stricter baseline
* **Special-category data (GDPR Art. 9).** A platform dedicated to the Yazidi community means that having an account can
  reveal religious and ethnic affiliation. Processing requires a valid exception — in practice **explicit consent**
  (Art. 9(2)(a)) — plus a **Data Protection Impact Assessment (DPIA)** before launch.
* **A community that has suffered persecution.** A central database of members, family graphs and locations would be a
  high-value target (hostile states or groups, scraping, doxxing, harassment). Design must assume this threat.
* **Children (EZID Kids).** GDPR Art. 8 (in Germany parental consent is required under 16), plus child-safety duties for
  platforms (e.g. DSA Art. 28). See `EZID_KIDS_SAFETY.md`.

## 2. Privacy-by-default rules
| Rule | Effect |
|---|---|
| Not discoverable by default | new profiles are not in search or directories until the person opts in |
| No public member directory, no public graph | the network is visible only to confirmed connections/family per audience |
| Display name may be a first name or nickname | legal name optional and private |
| Location: country only by default, city opt-in, never coordinates | protects people in sensitive regions |
| No inference of religion/ethnicity | no such fields, no analytics or AI that guesses them |
| Bulk-access protection | rate limits, pagination caps, no export of other people's data, anomaly alerts on mass viewing |
| EU hosting, encryption in transit and at rest | Supabase EU region; sensitive columns encrypted |
| Identity documents | **not collected in the MVP**; if added later: provider-based, no images retained |
| Audit log | security-relevant actions, append-only |
| Data export & deletion | self-service; deletion removes personal data and anonymises history |

## 3. Authentication & authorization
Supabase Auth (email + password, email verification; TOTP MFA mandatory for admins and recommended for all) ·
httpOnly session cookies · server-side authorization using the engine rules · Row Level Security deny-by-default on all
tables · signed, short-lived URLs for private media · rate limits on login, search, QR resolution.

## 4. QR security
256-bit random tokens stored as hashes · personal (revocable) and temporary (expiring) tokens · uniform responses to
prevent enumeration · per-user and per-IP limits · users can disable QR requests · scan events audited · scanning
never confirms a relationship.

## 5. Threat model (summary)
| Threat | Mitigation |
|---|---|
| Hostile actor enumerating members | not discoverable by default, no public lists, search requires login and is rate-limited, anomaly detection |
| Account takeover | MFA, session management, login alerts |
| Impersonation / fake relatives | two-sided confirmation, distinct confirmers, reports, human moderation |
| Location exposure | country-level only by default; no precise coordinates stored |
| Insider misuse | role-based admin access, MFA, audit of every admin read of personal data |
| Data breach | encryption, minimisation, backups, breach-response plan, 72-hour notification process |
| Harm to children | see `EZID_KIDS_SAFETY.md` |

## 6. Legal work required before public launch (cannot be done by code)
DPIA · privacy policy and consent texts in four languages · legal basis for Art. 9 data · children's consent model ·
processor agreements (Supabase, hosting, email) · records of processing · cookie/consent assessment.
