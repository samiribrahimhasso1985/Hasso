# EZIDNET — Project Vision (v1.1)

Status: **proposal for owner approval** · 2026-11-26 · Source: `EZIDNET_MASTER_PLAN_V1.1.md`

## 1. Mission
A comprehensive, trusted digital home for Yazidis worldwide that connects people, families, generations,
communities, culture, education, businesses and social activities — and gives Yazidi children a safe place to learn
their language, heritage and values (EZID Kids).

EZIDNET is **not a traditional family-tree application**: it is a relationship network (people = nodes,
relationships = edges) with identity, community, heritage and knowledge services around it.

## 2. Relationship to the existing work (FAMILY NETWORK)
The repository already contains a working, tested core built under the name FAMILY NETWORK: relationship engine,
PostgreSQL schema, API, interactive graph, privacy model, design system (96 automated tests).
**Proposal (decision EZ-1 in `DECISIONS.md`):** EZIDNET becomes the product built on this core. The engine, data
model, privacy rules and design system are reused; the brand, scope, languages, stack details and exclusions change
to EZIDNET v1.1. Nothing existing is deleted without approval; the FAMILY NETWORK documents stay in `docs/` as history
until the owner approves moving the EZIDNET documents to the top level.

## 3. Product map — nine centers
| # | Center | Content | First release? |
|---|---|---|---|
| 1 | **Identity** | account, profile, EZID ID, QR, profile photo, multi-dimensional identity, field privacy, verification statuses | ✅ MVP |
| 2 | **Network** | relationship graph, requests & confirmation, How Are We Connected?, Family Circles, people search, People Directory, communities, Global Communities, Interest Circles, Trusted Contacts | ✅ MVP (graph, requests, search); rest Phase 6 |
| 3 | **Social** | home dashboard, feed, messages, notifications, discover, events & calendar, Ask the Community, Language Exchange | Phase 6 |
| 4 | **Heritage** | EZID Heritage, cultural preservation, Oral History, Historical Timeline, Family History, Family Knowledge, My Legacy Story, Account Legacy, EZID World | Phase 8 |
| 5 | **Business** | EZID Market, personal & business stores, services marketplace, Business Connections, Business Partner Finder, Startup Hub, Career Opportunities, EZID Jobs, bookings, tickets, sponsorships, earnings dashboard, FN Coins (concept, legal review) | Phase 8 |
| 6 | **Creator** | Public Videos, Family Videos (only these two), Celebrity & Live, Interview Studio, Webinars, Content Production Hub, Creator Studio, collaboration, live gifts, paid live, memberships, sponsored content, earnings | Phase 8 |
| 7 | **Knowledge** | EZID Academy, Knowledge Network, research & educational resources, Mentorship Network, AI services (assistant, Family Historian, translator, career, document assistant, voice, recommendations) | Phase 8 |
| 8 | **Services** | help, events, travel, tickets, volunteering, Family Organizer, Family Documents, Family Vault, Family Reunion, Family Care, Life Timeline, My Life Map, Global Map | Phase 6–8 |
| 9 | **EZID Kids** | Learning, Languages, Games, Stories, Creative Studio, Discovery, Kids AI, Achievements, Parental Control Center | architecture now, build Phase 7 |

## 4. Principles (non-negotiable)
1. One person = one account = one identity = one node. No duplicate person records.
2. Every relationship starts as a request; QR scans, invitations and AI never create confirmed relationships.
3. Identity verification, relationship confirmation and professional verification are separate.
4. Only two video sections: Public Videos and Family Videos.
5. **Community safety first:** EZIDNET concerns a community that has suffered persecution. Being a member can reveal
   religious/ethnic affiliation (special-category data under GDPR Art. 9). Membership lists, family graphs and locations
   are therefore private by default, minimised and never published in bulk (see `SECURITY_AND_PRIVACY.md`).
6. Never infer religious or ethnic identity from names, photos, relationships or locations.
7. Children: guardian-linked accounts, no contact with strangers, no ads, no profiling (see `EZID_KIDS_SAFETY.md`).
8. Cultural content distinguishes documented facts, oral traditions and differing interpretations, and respects
   diversity within the community.
9. Excluded features (never built, never renamed): My Digital Passport · My Proof · Project Hub · Company Directory ·
   FN Magazine · My Video Archive · Friends Videos.
10. Budget-aware: €5,000 ceiling, gradual release, no purchases or deployments without approval.

## 5. Languages
Kurmanji (Latin script), Arabic (RTL), German, English — see `LOCALIZATION.md`.

## 6. Success criteria for the first public release (Phase 5)
- A person can register, set privacy, get an EZID ID and QR, and connect with relatives through confirmed requests.
- Families can see their confirmed network and How Are We Connected? — nothing private leaks to others.
- All four languages work, including RTL Arabic; the site installs as a PWA.
- A data protection impact assessment and privacy policy reviewed by a lawyer exist before public launch.
