# FAMILY TREE NETWORK
## Master Project Instructions — Product, Design & Engineering

- **Project:** Family Tree Network
- **Product Type:** Global Social Relationship Network
- **Design Identity:** Premium Dark Navy & Gold
- **Primary Languages:** Arabic, German, English
- **Future Language Support:** Kurdish
- **Platforms:** Web, Android, iOS
- **Development Approach:** Modular, Scalable, Secure, AI-Ready

---

## 1. ROLE AND MISSION

You are the lead software architect, senior full-stack developer, UI/UX designer, database architect, and technical project manager for FAMILY TREE NETWORK.

Your mission is to design and build a complete global social platform that connects:

- Family members.
- Parents and children.
- Brothers and sisters.
- Spouses and partners.
- Grandparents and grandchildren.
- Uncles, aunts, cousins, and extended relatives.
- Friends.
- Colleagues.
- Professional contacts.
- General acquaintances.

**IMPORTANT:** This is NOT a traditional genealogy application. This is a multidimensional relationship network.

Do not build a simple hierarchical tree where every person must be connected only through parent-child relationships.

The core of this project is a flexible relationship graph in which every person is an individual node and every connection has a defined relationship type.

## 2. PRODUCT VISION

Build a global platform where every person has a unique identity and can be connected to multiple social and family circles.

The application should combine:

- Interactive Relationship Network.
- Family Tree.
- Global Social Network.
- Public News Feed.
- Private Messaging.
- Family Memories Archive.
- Events and Calendar.
- Global Family Map.
- Smart Notifications.
- AI Family Assistant.
- Community Management.
- Privacy and Permission Management.

The platform must support multiple families and independent communities.

A person must not need a separate account for every family or social group.

**One person = one identity = multiple relationships.**

## 3. VISUAL IDENTITY AND DESIGN SYSTEM

Use the approved visual concept as the primary design reference.

### Design direction
Premium, modern, cinematic, elegant, futuristic and professional.

### Colors
| Token | Value |
|---|---|
| Main background | `#071426` |
| Secondary background | `#0D1B30` |
| Card background | `#13243D` |
| Primary gold | `#E8B94F` |
| Gold highlight | `#FFD978` |
| Blue connection | `#25A9FF` |
| Pink connection | `#FF4D91` |
| Purple connection | `#A56BFF` |
| Green connection | `#43D99A` |
| White text | `#F5F7FC` |
| Secondary text | `#AAB7CA` |

### UI principles
- Dark navy backgrounds.
- Gold accents and highlights.
- Rounded cards.
- Glowing relationship connections.
- Elegant profile images.
- Smooth transitions.
- Interactive visual graph.
- Professional responsive dashboard.
- Clear typography.
- Full Arabic RTL support.
- German and English LTR support.

Do not create a generic social media template.

The relationship graph must be the main visual identity of the application.

## 4. CORE FEATURE: MULTIDIMENSIONAL RELATIONSHIP GRAPH

This is the most important component of the entire project.

### 4.1 Graph structure
- Every person must be represented by one unique node.
- Every relationship must be represented by an edge connecting two people.
- A person can have unlimited relationships of different types, subject to system limits and permissions.
- The same person may appear in several family branches without creating duplicate accounts.

### 4.2 Relationship types
Implement the following relationship categories:

#### A. Family relationships
| Relationship | Connection type |
|---|---|
| Father | Parent |
| Mother | Parent |
| Son | Child |
| Daughter | Child |
| Brother | Shared parent relationship |
| Sister | Shared parent relationship |
| Grandfather | Extended parent relationship |
| Grandmother | Extended parent relationship |
| Grandson | Descendant |
| Granddaughter | Descendant |
| Uncle | Extended family |
| Aunt | Extended family |
| Cousin | Extended family |
| Nephew | Extended family |
| Niece | Extended family |

#### B. Marriage and partnerships
Husband. Wife. Spouse. Partner. Former spouse.

Support:
- Multiple marriages over time.
- Divorce.
- Marriage dates.
- Relationship history.
- Children from different marriages.

Do not assume that every family has the same structure.

#### C. Social relationships
Friend. Close friend. Childhood friend. School friend. Neighbor. Acquaintance. Travel friend.

#### D. Professional relationships
Colleague. Manager. Employee. Business partner. Former colleague. Professional contact.

#### E. Custom relationships
Allow authorized users to define custom relationship labels.

### 4.3 Relationship verification
Every relationship must have:
- Relationship type.
- Person A.
- Person B.
- Creation date.
- Creator.
- Verification status.
- Optional supporting information.
- Visibility permissions.

Verification statuses: Pending. Confirmed. Rejected. Disputed.

Sensitive family relationships must not automatically become verified simply because someone added them.

Allow both sides to confirm relationships where appropriate.

### 4.4 Interactive graph visualization
Use Cytoscape.js or another suitable graph visualization engine.

Required functionality:
- Zoom in and out.
- Drag and move nodes.
- Search for people.
- Open person profiles.
- Filter by relationship type.
- Show family relationships only.
- Show friends only.
- Show professional relationships only.
- Show all relationships.
- Highlight connected people.
- Display relationship paths.
- Expand and collapse branches.
- Navigate between generations.
- Display large graphs efficiently.

#### Visual relationship colors
| Relationship | Color |
|---|---|
| Family | Blue |
| Marriage | Pink |
| Friendship | Gold |
| Professional | Purple |
| Social | Green |

Use both colors and labels so the graph remains understandable and accessible.

### 4.5 Relationship discovery
Implement a feature named: **"How Are We Connected?"**

A user selects two people. The system calculates the shortest valid relationship path and displays:
- Connection path.
- Relationship types.
- Intermediate people.
- Verification status.

Never invent a relationship when no verified path exists.

Display "No verified connection found" when appropriate.

## 5. PERSON PROFILE

Each person must have one central profile.

Profile fields: Profile photograph. Full name. Display name. Date of birth (optional). Country. City (optional). Biography. Languages. Family relationships. Friends. Professional relationships. Photos. Videos. Posts. Events. Memories.

Each field must have its own privacy settings.

A user must be able to control what other people can see.

Do not expose private contact details or exact addresses publicly.

## 6. GLOBAL SOCIAL NETWORK

Create a global social feed.

The feed must support: Text posts. Images. Videos. Multiple image uploads. Comments. Replies. Reactions. Sharing. Mentions. Hashtags. Reporting. Post editing. Post deletion.

### 6.1 Post visibility
Every post must have one of these visibility options: PUBLIC. FAMILY. FRIENDS. SELECTED PEOPLE. PRIVATE.

#### PUBLIC behavior
When a person publishes a PUBLIC post:
- The post becomes visible in the global public feed.
- Other users can discover it through permitted search and discovery.
- The post may appear in relevant recommendations.
- Close relatives and selected social connections can receive smart notifications.
- Public visibility must not expose private profile information.

The global feed must support pagination and scalable ranking.

Do not send individual notifications to every platform user.

## 7. SMART RELATIONSHIP NOTIFICATIONS

Build an intelligent notification system.

When a user publishes a public post, identify relevant people using verified relationships and their notification preferences.

Suggested priority:
- **Priority 1:** Parents. Spouse. Children. Brothers and sisters.
- **Priority 2:** Grandparents. Grandchildren. Uncles and aunts. Close relatives.
- **Priority 3:** Close friends. Other friends. Professional contacts.

Notification delivery must respect: User preferences. Relationship visibility. Muted accounts. Blocked accounts. Quiet hours. Rate limits. Notification frequency.

Users must be able to disable individual relationship categories.

### 7.1 Special announcements
Support special post categories: New baby. Marriage. Engagement. Birthday. Family reunion. Condolences. Death announcement. Personal news. General announcement.

Sensitive announcements require appropriate verification and controlled notification policies.

Never automatically send sensitive notifications to everyone.

### 7.2 Notification channels
In-app notifications. Push notifications. Email notifications (optional). Notification center.

Prevent duplicate notifications. Group multiple notifications when appropriate.

## 8. COMMUNITY AND FAMILY MANAGEMENT

Allow users to create: Family communities. Extended family branches. Friend groups. Work communities. Private communities. Public communities.

Each community needs: Name. Description. Cover image. Members. Administrators. Membership rules. Posts. Events. Privacy settings.

Support invitations and membership requests.

Membership must be approved according to community rules.

## 9. MESSAGING SYSTEM

Build: One-to-one messaging. Group conversations. Family group chats. Community conversations. Image and video sharing. File sharing. Read status. Typing indicators. Message notifications. Blocking and reporting.

Use secure messaging architecture.

Evaluate end-to-end encryption for private conversations.

## 10. FAMILY MEMORIES AND HISTORY ARCHIVE

Build a digital archive for: Historical photographs. Videos. Audio recordings. Family stories. Important documents. Family events. Historical timelines.

Support tagging people in photographs, with consent.

Allow users to add dates and descriptions.

Create a chronological family history view.

Never claim that AI-generated historical information is verified fact.

## 11. EVENTS AND CALENDAR

Support: Birthdays. Weddings. Anniversaries. Family reunions. Community events. Memorial events. Private invitations.

Features: Event creation. Invitations. Attendance confirmation. Reminders. Event photographs. Calendar view.

## 12. GLOBAL MAP

Create an optional global map showing participating members and family communities.

Features: Country-level distribution. City-level distribution where permitted. Family branches. Community locations. Geographic filters.

Never expose precise private locations without explicit consent.

Location sharing must be optional.

## 13. FAMILY AI

Create an AI assistant called: **FAMILY AI**

Its responsibilities:
- Assist with building family networks.
- Suggest possible relationship connections.
- Detect duplicate profiles.
- Help organize historical information.
- Transcribe audio recordings with consent.
- Search people using natural language.
- Summarize verified family history.
- Explain relationship paths.

AI must never automatically establish parentage, marriage, identity, or sensitive relationships.

AI suggestions must be clearly marked as suggestions and require human confirmation.

Support Arabic, German and English.

## 14. USER REGISTRATION

Support two membership methods:

**Method A: Invitation** — Invitation link. QR code. Email invitation. Membership confirmation.

**Method B: Public registration and membership requests** — Public registration. Email verification. Phone verification where required. Profile creation. Community search. Membership request. Approval process.

Use one unique account per person.

Prevent duplicate identities where possible without invasive identification.

## 15. PRIVACY AND SECURITY

Privacy is a core requirement.

Implement: GDPR-compliant data handling. Consent management. Role-based access control. Fine-grained profile visibility. Relationship visibility controls. Secure authentication. Password recovery. Optional multi-factor authentication. Encryption in transit. Encryption at rest. Audit logs. Account deletion. Data export. Reporting and blocking. Moderation tools.

Children must have protected accounts managed through appropriate parental controls.

Do not make children's profiles or information publicly searchable by default.

Use data minimization.

Do not use family photographs or private information for AI training without appropriate explicit consent.

## 16. TECHNICAL ARCHITECTURE

Use a modular and scalable architecture.

Recommended stack:
- **Frontend — Web:** Next.js. TypeScript. React. Responsive design.
- **Frontend — Mobile:** Flutter. Android. iOS.
- **Backend:** NestJS. TypeScript. REST API. WebSocket support for real-time functionality.
- **Database:** PostgreSQL. Prisma ORM. Proper relational modeling. Indexed relationship tables.
- **Graph visualization:** Cytoscape.js. Graph layout optimization. Virtualization and progressive loading.
- **Storage:** S3-compatible object storage. Image optimization. Video processing. Secure file access.
- **Infrastructure:** Docker. CI/CD. Automated testing. Logging. Monitoring. Backups.

Keep the architecture modular so components can be replaced without rewriting the entire application.

Do not introduce unnecessary microservices in the first version.

## 17. DATABASE DESIGN

Create a carefully normalized database.

At minimum, design these entities: users, profiles, families, family_memberships, communities, community_memberships, relationships, relationship_types, relationship_verifications, posts, post_media, comments, reactions, shares, notifications, notification_preferences, conversations, conversation_members, messages, events, event_attendees, memories, media_assets, invitations, membership_requests, privacy_settings, blocks, reports, audit_logs.

Important:
- Relationships must be stored independently of family membership.
- A person can belong to several communities and have relationships with people outside those communities.
- Avoid duplicate person records.
- Use database constraints and transactions where appropriate.
- Document the database schema and relationships.

## 18. APPLICATION SCREENS

Design and implement the following screens: Welcome / Splash Screen. Registration. Login. Profile Setup. Create Family. Join Family. Main Dashboard. Interactive Relationship Graph. Person Profile. Relationship Details. How Are We Connected? Global Feed. Create Post. Notifications. People Directory. Community Management. Private Messages. Memories Archive. Events Calendar. Global Map. Family AI. Admin Dashboard. Privacy Settings. Account Settings.

All screens must be responsive.

Arabic must support proper RTL layout, including navigation, text, menus, graph labels and forms.

## 19. DEVELOPMENT PHASES

Work in clearly defined phases.

- **PHASE 1 — Project foundation:** Analyze requirements. Create architecture documentation. Create repository structure. Configure development environment. Set up database. Implement authentication. Implement user profiles. Implement basic permissions.
- **PHASE 2 — Relationship engine:** Design relationship schema. Implement relationship creation. Implement verification. Implement relationship graph. Implement graph filters. Implement connection path calculation. Test complex family structures. **This phase is the highest priority.**
- **PHASE 3 — Social platform:** Global feed. Post visibility. Media uploads. Comments. Reactions. Sharing. Smart notifications.
- **PHASE 4 — Communities and messaging:** Family groups. Friend groups. Membership requests. Invitations. Private messaging. Group conversations.
- **PHASE 5 — Memories and events:** Historical archive. Albums. Events. Calendar. Global map.
- **PHASE 6 — AI:** Family AI. Relationship suggestions. Duplicate detection. Natural language search. Audio transcription.
- **PHASE 7 — Production readiness:** Security review. Performance tests. Accessibility. Automated testing. Deployment. Documentation.

## 20. TESTING REQUIREMENTS

Do not consider a feature complete merely because its interface looks correct. Test actual behavior.

Important scenarios:
- One person has parents, siblings, spouse, children, friends and colleagues.
- Two people belong to different family communities but share a verified relationship.
- A person marries into another family.
- A person has children from multiple marriages.
- A user requests a relationship and the other person rejects it.
- A user publishes a public post.
- The public post appears in the global feed.
- Relevant relatives receive notifications according to their settings.
- A muted user receives no prohibited notifications.
- Private posts remain inaccessible to unauthorized users.
- A blocked person cannot access restricted content.
- Arabic RTL and German/English LTR work correctly.

Include unit, integration, and end-to-end tests.

## 21. IMPORTANT DEVELOPMENT RULES

- Do not simplify the multidimensional relationship graph into a traditional family tree.
- Do not create duplicate accounts for the same person.
- Do not hardcode relationships.
- Do not mix relationship data with community membership data.
- Do not expose private information.
- Do not send notifications without checking preferences.
- Do not create fake users or fake family relationships in production.
- Use realistic demo data only in development.
- Keep the application modular.
- Document important architectural decisions.
- Write maintainable code.
- Use migrations for database changes.
- Never claim a feature is complete without testing it.
- Do not replace existing working features without reviewing their dependencies.
- Preserve existing project files and inspect the repository before modifying it.

## 22. CLAUDE WORKFLOW

Before writing code:
- Inspect the existing project and repository.
- Identify existing files and technologies.
- Compare the current implementation with this specification.
- Identify missing features.
- Create a development roadmap.
- Create a detailed architecture document.
- Present the initial implementation plan.

Then implement one phase at a time.

For every phase:
- Explain the objective.
- List files to be created or changed.
- Implement the feature.
- Run tests.
- Fix errors.
- Document the result.
- Report remaining work.

Do not start all phases simultaneously.

Do not stop after creating mockups or static HTML pages.

The goal is a real, functional application with a working backend and database.

## 23. FIRST TASK FOR CLAUDE

Start by performing a complete project assessment.

Deliver these documents: `PROJECT_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `RELATIONSHIP_ENGINE.md`, `UI_UX_GUIDELINES.md`, `DEVELOPMENT_ROADMAP.md`, `SECURITY_AND_PRIVACY.md`.

Then create the initial project structure.

Prioritize the relationship engine and its data model before implementing the remaining social features.

The first working prototype must demonstrate:
- A central person.
- Parents.
- Siblings.
- Spouse.
- Children.
- Uncles and cousins.
- Friends.
- Colleagues.
- Acquaintances.

Each relationship must be visually distinguishable and independently manageable.

The prototype must demonstrate how one person can connect to multiple family branches and social circles without duplicate accounts.

**Final mission:** Build FAMILY TREE NETWORK as a real, scalable global relationship platform. It should connect people, families, generations, friends and communities in one intelligent network. Do not build just a family tree. Build a complete relationship ecosystem.

## 24. FAMILY IDENTITY & SMART QR CONNECTION SYSTEM

**Objective:** Implement a unique digital identity and QR-based relationship connection system for every registered person. This feature is a core component of FAMILY TREE NETWORK. Every user must have a unique identity, a personal QR code, and a secure process for connecting with other people.

### 24.1 Unique Family ID
Upon successful registration, generate: unique Family ID · unique QR code · user profile · verified phone number status · identity verification status · account status. Example: `FT-829471`.

Requirements: IDs must be unique. IDs must not contain national identification numbers. IDs must not expose phone numbers. IDs must not reveal private personal information. IDs must remain stable throughout the account lifetime.

### 24.2 Personal QR Code
Generate a unique QR code for every account. The QR code must contain an opaque, secure, non-guessable connection token or a secure application URL.

Never encode into a QR code: national ID number · passport number · phone number · date of birth · private profile information.

QR functionality: display personal QR code · scan another person's QR code · share QR code · download QR code · regenerate or revoke QR tokens · report suspicious QR codes · expire temporary connection tokens.

The QR code identifies an account, not an already-established relationship.

### 24.3 QR Scanning Workflow (exact)
1. User opens the QR scanner.
2. User scans another person's QR code.
3. Backend validates the QR token.
4. Application retrieves the permitted public profile information.
5. Application displays the person's profile.
6. User selects the relationship type.
7. User submits a relationship request.
8. Recipient receives a notification.
9. Recipient accepts, rejects, or reports the request.
10. If accepted, create the relationship record.
11. Update the relationship graph.
12. Update both users' connection lists according to permissions.

Do not create a verified relationship immediately after scanning.

### 24.4 Relationship Selection
After scanning, display these categories:
- **FAMILY:** Father, Mother, Son, Daughter, Brother, Sister, Grandfather, Grandmother, Uncle, Aunt, Cousin, Nephew, Niece.
- **MARRIAGE:** Husband, Wife, Spouse, Partner, Former spouse.
- **SOCIAL:** Friend, Close friend, Childhood friend, Neighbor, Acquaintance.
- **PROFESSIONAL:** Colleague, Manager, Employee, Business partner, Professional contact.
- **OTHER:** Custom relationship.

The application must validate relationship direction and reciprocity. Example: if Person A requests "Father" for Person B, Person B's corresponding relationship to Person A is "Child". Do not assume all relationships have a simple reciprocal label — use a relationship mapping engine. Friendship: both users may be described as friends. Family: support directional and shared relationships.

### 24.5 Relationship Request Screen
Display: requesting person's name · profile picture · Family ID · selected relationship · optional message · Accept · Reject · Report.

States: Pending · Accepted · Rejected · Cancelled · Disputed. Only accepted and properly verified relationships are treated as confirmed.

### 24.6 Identity-Based Registration
Required: full legal name · display name · country · date of birth · identity document type · identity verification status · mobile phone number · email address · password or supported secure authentication method.

Identity document types configurable by country: national identity card · passport · residence permit · other supported official identity documents.

### 24.7 Identity Verification
Use a suitable identity verification provider where legally available. States: Not started · Pending · Verified · Rejected · Requires manual review.

Privacy: never expose national ID numbers to other members · never store identity document images unnecessarily · use secure third-party verification where appropriate · store only the minimum verification result and reference needed · encrypt sensitive information · strict retention and deletion policies · comply with GDPR and national laws · support account recovery without exposing identity documents · do not assume one document format works worldwide · minors: separate age-appropriate registration and parental authorization workflow.

### 24.8 Mobile Phone Verification
International country code selection · phone number validation · SMS OTP verification · OTP expiration · resend limits · rate limiting · abuse protection · phone number change verification. Phone numbers remain private. One verified phone number must not silently create multiple accounts. Safe account recovery and phone number replacement procedure.

### 24.9 QR Security
Cryptographically secure random tokens · token expiration or revocation · server-side validation · rate limiting · anti-enumeration protection · abuse detection · audit logging. Never use sequential IDs as QR security tokens. Users can temporarily disable QR-based connection requests.

### 24.10 User Interface
Screens: My Digital Identity · My Personal QR Code · QR Scanner · Scanned Person Profile · Select Relationship · Send Connection Request · Incoming Relationship Requests · Request History · Identity Verification · Mobile Phone Verification · QR Privacy Settings. Keep the approved visual identity (see §25 — direction under review). Arabic RTL must work correctly.

### 24.11 Database Entities
Add: `identity_verifications`, `phone_verifications`, `user_identifiers`, `qr_tokens`, `relationship_requests`, `relationship_type_mappings`, `qr_scan_events`. Use secure references; avoid duplicating sensitive identity information.

### 24.12 Acceptance Tests
- Every registered account receives a unique Family ID.
- Every eligible account can generate a personal QR code.
- QR scanning retrieves the correct account.
- Expired QR tokens are rejected.
- Revoked QR tokens cannot be used.
- Scanning does not automatically establish a relationship.
- Relationship selection works correctly.
- Reciprocal relationship labels are handled correctly.
- The recipient can accept or reject a request.
- Accepted relationships appear in the graph.
- Rejected requests do not create confirmed connections.
- Phone verification works with international country codes.
- Private identity information is never exposed.
- Users can control QR connection permissions.
- Duplicate account risks are handled safely.

**Implementation priority:** after the initial authentication foundation and alongside the relationship engine. Must integrate with the existing relationship graph — no separate, disconnected social-connection database.

**Final requirement:** Every person has one unique digital identity. Every relationship begins with a connection request. QR scanning makes it easy to find and connect with people, while identity verification, consent and privacy keep the network trustworthy.

### Phase summary (as restated by the product owner)
- Phase 2 — Relationship Engine: adding people, relationship requests, relationship map, approval and verification.
- Phase 3 — Social Network: posts, comments, photos, videos, reactions.
- Phase 4 — Communities & Messenger: groups, messages, private communities.
- Phase 5 — Memories & AI: memories archive, events, smart assistant, advanced search.

## 25. DESIGN DIRECTION UNDER REVIEW — "Soft Minimalism & Elegant Neutral Colors"

> **Status: PROPOSED, NOT YET DECIDED** (note: §29 profile-photo UX already refers to this palette — owner leaning towards it; awaiting explicit confirmation). This proposal contradicts §3 (Dark Navy & Gold, glowing connections). Until the product owner confirms the final direction, §3 stays in force and no visual redesign is applied.

**Philosophy:** a premium international relationship platform (family, friends, professional, digital identity & QR, private communities, posts & memories) that must not look like a traditional family-tree app; calm, elegant, sophisticated, timeless.

**Light palette (low saturation):** background Warm Ivory `#F7F6F2` · secondary Soft Stone `#EFEEE9` · cards `#FFFFFF` · primary text Charcoal `#292D2B` · secondary text Warm Gray `#777A75` · borders Light Stone `#E4E2DC` · family Muted Sage `#91A497` · friendship Dusty Blue `#8799A7` · professional Soft Taupe `#AD9B88` · marriage Dusty Rose `#B99A9A` · social Muted Olive `#A6A58A`.

**Strict rules:** no neon, no saturated blue, no bright gold, no strong purple, no glowing effects, no aggressive gradients, no excessive shadows, nothing visually overwhelming.

**Style:** Scandinavian minimalism, premium editorial design, generous whitespace, rounded cards 16–20 px, thin borders, very subtle shadows, elegant line icons, consistent typography, clear hierarchy. Typography: Arabic IBM Plex Sans Arabic or Noto Sans Arabic; English/German Inter. Full RTL/LTR.

**Screens:** Home Dashboard (welcome, profile picture, search, network overview, recent activity, suggested connections, upcoming events, community posts) · Relationship Network (one node per person even with several relationship types; muted colours; zoom, drag, search, filters, expand/collapse, open profiles) · Digital Identity (photo, Family ID, QR, share, download, phone & identity status, regenerate/revoke; scanning creates a request, never a relationship) · Social Feed · Communities · Profile · Messages · Memories & Events.

**Navigation:** mobile bottom bar with five items — Home, My Network, Create, Messages, Profile. Web: left sidebar, central content, optional right panel; same design language on mobile, tablet and desktop.

**Optional dark mode:** background `#202522` · cards `#292F2B` · primary text `#F1F0EA` · secondary text `#B5B7B0` · borders `#3A403B` · muted relationship colours with sufficient contrast.

**Instructions:** inspect structure first; centralised design tokens; reusable components; apply consistently; responsive; test RTL/LTR; check accessibility and contrast; do not remove existing functionality; do not fake backend functionality or claim non-functional QR codes are real.

**Design documentation to create when adopted:** `DESIGN_SYSTEM.md`, `COLOR_TOKENS.md`, `TYPOGRAPHY.md`, `COMPONENT_LIBRARY.md`, `RESPONSIVE_LAYOUT.md`, `ACCESSIBILITY.md`.

**Goal:** elegant not flashy · modern not futuristic · minimal not empty · professional not corporate-heavy · warm not childish · calm not boring.

## 26. REPORTING RULE

Whenever the product owner asks for a report ("تقرير"), deliver a complete report covering: what was done (with evidence: tests run and results), what is in progress, what changed since the last report, open decisions, known problems and risks, and next steps. Keep `docs/PROGRESS_REPORT.md` updated at the end of every phase or significant change, with a dated change log, so a report can always be produced from it.

## 27. COMPLETE APP SITEMAP (v1.0)

Full text: [`docs/specs/APP_SITEMAP.md`](docs/specs/APP_SITEMAP.md). 22 sections: onboarding, home, my network, digital identity, discover, feed, communities, messages, memories, events, global map, Family AI, people directory, family history, family vault, life timeline, notifications, profile & settings, administration platform, navigation, core product rules, release priorities.

**Releases (authoritative order):** R1 Core Platform (auth, profiles, Digital ID, QR scanner, relationship engine, graph, connection requests, privacy center) → R2 Social (feed, posts/comments, discover, communities, messages, notifications) → R3 Personal Archive (memories, events, life timeline, people directory, family history) → R4 Advanced (Family AI, global map, vault, analytics, subscription) → R5 Production & global expansion.

**Navigation:** mobile bottom bar Home · My Network · Discover · Messages · Profile (+ central contextual Create action). Desktop: left sidebar, central content, right panel (events, requests, suggestions, activity).

**Core product rules:** one identity per user · multiple relationship types per person · relationships need confirmation · QR never auto-creates a relationship · backend-enforced privacy for every sensitive field and all content · enhanced child protection · export & deletion · auditable changes · AI suggestions distinguishable from facts. Never replace working functionality without approval; build modules incrementally and test each.

## 28. SMART IDENTITY REGISTRATION & AUTOMATIC ACCOUNT CREATION

Full text: [`docs/specs/SMART_IDENTITY_REGISTRATION.md`](docs/specs/SMART_IDENTITY_REGISTRATION.md). Extends §24.

Flow: country & document type → camera document capture → provider OCR + user review → identity verification via configurable provider (statuses Not Started/Pending/Processing/Verified/Rejected/Requires Review/Expired) → mandatory phone + SMS OTP (E.164) → suggested platform email → username & profile URL (`/@username`) → permanent Family ID → digital identity card + QR.

Non-negotiable: OCR is not verification; a captured document is not verification · no permanent document images or full document numbers by default (provider result + reference) · OTPs never stored in plain text · identity verification ≠ relationship verification · platform email requires an owned, configured domain (initial release: email identity + verified contact email, not a mailbox).

## 29. PROFILE PHOTO CAPTURE & UPLOAD

Full text: [`docs/specs/PROFILE_PHOTO.md`](docs/specs/PROFILE_PHOTO.md). Mandatory profile photo at registration: camera capture (mobile front/rear, desktop webcam) or upload (JPG/PNG/WEBP, validated by content not extension) with crop/zoom/rotate editor. Stored in access-controlled object storage (`profile_photos`), never in PostgreSQL. Profile photo, document portrait and live selfie are three distinct images and must never be confused.

## 30. VERIFIED ACCOUNTS, CELEBRITY INTERVIEWS & LIVE STREAMING

Full text: [`docs/specs/VERIFIED_ACCOUNTS_AND_LIVE.md`](docs/specs/VERIFIED_ACCOUNTS_AND_LIVE.md) (§27, §27.17 interview requests, §27.18 admin-controlled verification).

Badges are approved **manually by administrators only**, never automatically, never for payment or popularity; backend-controlled; immutable audit log; appeals. Interview requests with scheduling (UTC storage, local display), private rooms, recording consent. Live streaming gated by eligibility levels 1–4, built on a replaceable provider (WebRTC/RTMPS/HLS evaluated). **Public live streaming must not launch before moderation, reporting, emergency termination, privacy and legal compliance are operational.** A badge does not mean endorsement.

---

## Working notes for this repository

- Code lives under `family-tree-network/`. The sibling folders `IKTISHAFAT_AI_STUDIO/` and `quote-images/` belong to other work and must not be modified.
- Architecture & decisions: `family-tree-network/docs/`.
- Run all tests: `cd family-tree-network && npm test` (requires the local PostgreSQL described in `README.md`).
- Progress report (kept up to date, see §26): `family-tree-network/docs/PROGRESS_REPORT.md`.
- Implementation plan mapped to the sitemap: `family-tree-network/docs/IMPLEMENTATION_PLAN.md`.
- Full specification texts: `family-tree-network/docs/specs/`.
