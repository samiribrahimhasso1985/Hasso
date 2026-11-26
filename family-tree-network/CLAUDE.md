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

---

## Working notes for this repository

- Code lives under `family-tree-network/`. The sibling folders `IKTISHAFAT_AI_STUDIO/` and `quote-images/` belong to other work and must not be modified.
- Architecture & decisions: `family-tree-network/docs/`.
- Run all tests: `cd family-tree-network && npm test` (requires the local PostgreSQL described in `README.md`).
