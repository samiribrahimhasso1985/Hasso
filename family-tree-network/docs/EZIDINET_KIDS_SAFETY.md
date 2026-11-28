# EZIDINET Kids — Safety & Child Data Protection (v1.2)

Status: **proposal; lawyer review required before any Kids launch** · base document: `ezidnet/EZID_KIDS_SAFETY.md`
(legal frame, principles, guardian model, data minimisation — all still valid). This file adds the rules for the v1.2
modules.

## Unchanged core rules
No contact with strangers (no messaging, comments, follows, public profiles) · no exposure in search, maps, Pulse or
directories · **no ads and no profiling** — including Smart Profile Ads: advertising is never shown in the Kids area
and never targeted at accounts under 18 · guardian consent for every child · minimal data · no inference of religion
or ethnicity · human-reviewed content only.

## Additions for v1.2 modules
| Module | Added safeguards |
|---|---|
| Story Maker | private to family; no publication; text filter for personal data (names, phone, address) with guardian notice |
| My Companion | scripted by default; no emotional-dependency design; break reminders; AI only via guardian-enabled Kids AI |
| Little Speaker | recordings local by default; uploads only with guardian permission; short retention; no voiceprints |
| Kids Classroom | admin-verified teachers linked to institutions; no 1:1 teacher-child messages; guardians see all class communication; guardian-entered invite codes; report button for guardians |
| Kids AI | approved knowledge base; topic allow-list; refuses personal questions; never collects data; escalation summary to guardian for safety topics (self-harm, abuse) with crisis-line information; logs reviewed for safety, deleted after retention |
| 13–16 group | still guardian-managed in the Kids area; access to the adult social area only from the local legal age (EU default 16; Australia: social-media minimum age 16) — decision EZ-22 |
| Open Community | projects/events involving children require special review (owner's spec) and guardian consent per child |

## Safeguarding operations (not code — needed before launch)
Named safeguarding lead · reporting procedure to authorities where legally required · moderator training · incident
log · yearly review.

## Tests
Ads API never returns ads for child sessions · no endpoint exposes a child to non-guardians · classroom messages visible
to guardians · Companion has no free-text input when Kids AI is off · upload blocked without guardian permission.
