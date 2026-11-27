# EZIDINET — Approved Expansion Scope v1.2 + Smart Profile Ads + Open Community Participation

Owner's text, stored verbatim (received 2026-11-27). Engineering interpretation and open questions:
`../EZIDINET_EXPANSION_PROPOSAL_V1.2.md`.

---

EZIDINET — APPROVED EXPANSION SCOPE

Version 1.2 — Global Community, Heritage, Kids & AI

The following modules are officially approved and must be integrated into the EZIDINET master project.

A. CULTURE & HERITAGE

1. EZIDINET Digital Museum
2. EZIDINET Sound Heritage
3. EZIDINET 3D Heritage
4. EZIDINET Cultural Preservation
5. EZIDINET AI Cultural Researcher

Requirements:

- Digital collections of photographs, manuscripts, objects and historical materials.
- Audio archive for music, songs, oral histories and recordings.
- Source attribution, contributor credits and rights management.
- Consent and permissions for recordings and photographs.
- 3D digital exploration of cultural and historical locations.
- Research references and distinction between documented history and oral traditions.
- Human editorial review.

B. GLOBAL COMMUNITY

1. EZIDINET Community Pulse
2. EZIDINET Welcome
3. EZIDINET Emergency Support
4. EZIDINET Festival Network
5. EZIDINET WORLD

Requirements:

- Global community activity overview using privacy-respecting aggregated information.
- Welcome and orientation services for community members in different countries.
- Emergency assistance coordination and verified aid organizations.
- Global cultural festivals, celebrations and event management.
- World directory of community institutions and cultural organizations.
- Community maps and international cooperation.
- No public exposure of sensitive personal or location data.

C. EZIDINET KIDS

EZIDINET Kids remains a major independent product area.

Approved modules:

- Kids World.
- Story Maker.
- Kids Classroom.
- Kids AI.
- Little Speaker.
- My Companion.
- Learning.
- Languages.
- Games.
- Stories.
- Creative Studio.
- Discovery.
- Achievements.
- Parental Control Center.

Requirements:

- Age groups 3–5, 6–8, 9–12 and 13–16.
- Kurmanji language education.
- Arabic, German and English support.
- Original educational games.
- Cultural and historical lessons.
- Interactive stories and creative activities.
- Parent approval for new content.
- Child-safe AI and human-reviewed educational material.
- Parental controls, privacy and safeguarding.
- Future standalone Android and iOS application connected to the main EZIDINET backend.

D. EZIDINET AI ECOSYSTEM

Approved services:

- AI Cultural Researcher.
- AI Cultural Translator.
- AI Voice Archive.
- AI Event Organizer.
- AI Learning Path.
- AI Assistant.
- AI Heritage Research.

Requirements:

- Multilingual support.
- Reliable knowledge sources and references.
- Human review for sensitive historical and cultural claims.
- Consent and rights management for voice recordings.
- Age-appropriate AI behavior for children.
- No autonomous high-impact identity or safety decisions.

E. ECONOMIC OPPORTUNITIES

EZIDINET Freelance:

- Professional skills profiles.
- Freelance opportunities.
- Client and service-provider discovery.
- Project collaboration.
- Work portfolios.
- Secure payment-provider integration in a later phase.

F. ARCHITECTURE AND IMPLEMENTATION

Integrate these modules into:

- Master product architecture.
- Navigation and screen map.
- Database planning.
- API architecture.
- Permissions and role model.
- Localization.
- Security and privacy.
- Administration tools.
- Testing strategy.
- Development roadmap.

Create these documentation files:

- docs/EZIDINET_WORLD.md
- docs/EZIDINET_HERITAGE.md
- docs/EZIDINET_SOUND_HERITAGE.md
- docs/EZIDINET_DIGITAL_MUSEUM.md
- docs/EZIDINET_COMMUNITY_PULSE.md
- docs/EZIDINET_WELCOME.md
- docs/EZIDINET_EMERGENCY_SUPPORT.md
- docs/EZIDINET_FESTIVAL_NETWORK.md
- docs/EZIDINET_KIDS_SPECIFICATION.md
- docs/EZIDINET_KIDS_GAMES.md
- docs/EZIDINET_KIDS_SAFETY.md
- docs/EZIDINET_AI_ECOSYSTEM.md
- docs/EZIDINET_FREELANCE.md

Consolidate overlapping functionality into coherent modules without removing any approved capability.

Do not attempt to implement all modules simultaneously.

Preserve the €5,000 initial budget ceiling and prioritize a phased implementation.

First update the documentation, screen map, database architecture and roadmap. Present the proposed changes for approval before implementing the expansion modules.

All modules must use the official project name EZIDINET.
EZIDINET — AD-TO-PROFILE NAVIGATION

Official Feature: Smart Profile Ads

Every advertisement published in EZIDINET must be connected to its owner's profile or storefront.

1. Advertisement Click Behavior

When a visitor clicks an advertisement:

- Open the owner's public EZIDINET profile or business storefront.
- Display the advertised product or service prominently.
- Allow the visitor to explore the owner's other publicly available content.
- Provide direct messaging and contact options according to privacy settings.

2. Personal Seller Profile

Display:

- Profile photo and display name.
- Biography and public information.
- Personal Sale listings.
- Product descriptions, prices and currencies.
- Product availability and condition.
- Skills & Talents.
- Public portfolio and approved media.
- Contact and messaging options.
- Reviews where eligible.
- Follow and save actions.

3. Business Storefront

Display:

- Business name and logo.
- Business information and approved verification status.
- Product catalogue.
- Prices, discounts and availability.
- Offers and promotions.
- Customer contact and order options.
- Business reviews.
- Store policies and relevant legal information.

4. Data Architecture

Every listing must contain:

- listing_id
- owner_user_id
- owner_type (PERSONAL or BUSINESS)
- listing_type
- title
- description
- price
- currency
- condition
- availability_status
- media_assets
- location_visibility
- publication_status
- created_at
- updated_at

The owner_user_id must reference the actual EZIDINET account. Never create duplicate profiles for advertisements.

5. Navigation

Use a secure canonical profile route:

- Personal: /profile/{public_profile_slug}
- Business: /business/{public_business_slug}

The advertisement may link to the profile with a listing-specific identifier so the destination opens the relevant listing first.

6. Privacy and Security

Only publicly authorized profile fields may be displayed.
Never expose private messages, identity documents, private family relationships, private phone numbers or hidden profile information.

7. Business Rules

- Personal Sale remains free under the personal-use policy.
- Commercial storefront advertising follows paid business plans.
- Personal and business listings must be classified correctly.
- Moderation and fraud prevention apply to both.
- Preserve the original advertisement attribution and owner relationship.

EZIDINET — OPEN COMMUNITY PARTICIPATION

Official Approved Product Specification

The latest decision replaces the previous mandatory pre-approval requirement for ordinary community projects.

Open Creation and Publication

Every eligible EZIDINET member can:

- Create personal initiatives and community projects.
- Publish ordinary projects directly without prior administration approval.
- Invite members and build project teams.
- Accept or manage participant applications.
- Assign tasks and responsibilities.
- Publish updates, media and progress reports.
- Manage project milestones.
- Complete, archive or cancel projects.

Project Categories

Cultural, heritage, educational, language, humanitarian, volunteering, youth, scientific, artistic, social, environmental, professional, economic and international cooperation.

Special Review Requirements

Additional verification or approval is required before activating:

- Fundraising and financial collections.
- Emergency support and humanitarian assistance.
- Activities involving children.
- Collection or processing of sensitive personal data.
- High-risk events or activities requiring permits.

Community Safety

- Community reporting.
- Moderation and abuse prevention.
- Temporary suspension and removal when justified.
- Transparent moderation reasons.
- Appeals process.
- Audit history for administrative actions.
- Organizer accountability.

Integrations

EZIDINET Community Hub, Ideas, Volunteers, Local, WORLD, Notifications and Admin Dashboard.

Important Rule

Do not require prior administration approval for ordinary projects. Preserve open member participation while applying proportionate safety checks to sensitive activities.

This specification supersedes the earlier mandatory pre-approval workflow.

