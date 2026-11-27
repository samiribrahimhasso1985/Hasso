# EZIDINET Community Pulse (v1.2)

Status: **proposal** · Phase C · official name EZIDINET.

## Purpose
A global overview of community activity using **privacy-respecting aggregated information** — what is happening, not
who is where.

## What Pulse shows
* Activity counts: new projects, events, heritage items published, lessons completed (Kids totals only), volunteers
  needed — per week, per region.
* Upcoming festivals and events (`EZIDINET_FESTIVAL_NETWORK.md`).
* Open calls: projects looking for volunteers, Emergency Support notices from verified organizations.
* Language activity (e.g. number of Kurmanji lessons completed) — totals only.

## Privacy rules (non-negotiable)
1. Only aggregates; never lists of members, never individual activity.
2. **Minimum threshold:** a figure is shown only if it counts at least k = 50 people (proposal; configurable); otherwise
   "fewer than 50".
3. **High-risk countries:** member-derived numbers are not shown for countries flagged high-risk
   (`ezidnet/TARGET_MARKETS.md`); event/project counts only if organizers made them public.
4. Geography: country or larger region only.
5. No inference of religion/ethnicity; Pulse counts platform activity, not people's identity.
6. Children's data: only global totals of learning activity, never per child, never per small region.
7. Computed server-side from a nightly job into `pulse_snapshots`; no raw queries from the client.

## Screens
Pulse home (cards + simple charts) · Region view · "How these numbers are made" (transparency page).

## Tests
Threshold enforced · high-risk suppression · no endpoint returns per-user rows · snapshots contain no personal IDs.
