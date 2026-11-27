# EZIDINET Emergency Support (v1.2)

Status: **proposal** · Phase C (later step) · **special review category** under Open Community Participation.

## Purpose
Emergency assistance coordination with **verified aid organizations** — EZIDINET connects people with help; it is not
an emergency service.

## Hard boundaries
* Every Emergency screen shows: "In immediate danger call your local emergency number" with the number for the user's
  chosen country.
* EZIDINET does not dispatch help, does not promise response times and does not replace authorities.
* Only **verified aid organizations** (human-verified by administrators, `institution_verifications`) can publish
  emergency appeals or receive requests. Individuals cannot run emergency campaigns without special review.
* Fundraising for emergencies goes only through verified organizations and a licensed payment provider (later phase);
  no collections inside EZIDINET before payment and legal review.

## Functions
1. **Verified organizations list** (by country/region, services offered: food, shelter, medical, legal aid, psychosocial).
2. **Request help:** a member sends a private request to a chosen verified organization; message is visible only to that
   organization's authorized responders; minimal data form; location optional and only city-level unless the member
   decides otherwise for that request.
3. **Appeals:** verified organizations publish needs (volunteers, goods) — shown in Pulse and Notifications by region.
4. **Crisis mode** (admin-activated for a region): banner, curated list of organizations, extra moderation, rumour
   control (only verified sources can post updates).

## Privacy and security
Requests are special-category data (health, safety) → encrypted, short retention (proposal: 180 days after closure),
access logged, never visible to other members. No exposure of victims or locations. Discreet mode applies.

## Abuse prevention
Rate limits, fraud reports, organizer accountability, verification renewal yearly.

## Data (planning)
`aid_organizations` (institutions with type AID), `help_requests` (encrypted payload), `help_request_events`,
`emergency_appeals`, `crisis_modes`.

## Approval needed (EZ-21)
Legal review of liability and data protection before launch; which organizations are the first verified partners.
