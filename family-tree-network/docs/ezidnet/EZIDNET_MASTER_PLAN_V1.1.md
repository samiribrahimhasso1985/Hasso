# EZIDNET.COM — Master Development Plan, Version 1.1 (EZID Kids Integration)

> Source: product owner, 2026-11-26. Stored as received (formatting condensed, content unchanged).
> Analysis, reconciliation with the existing code and proposals: see the other files in `docs/ezidnet/`.

## 1. Project identity
Project: EZIDNET · Target domain: EZIDNET.COM (not purchased yet) · Platform: global digital platform dedicated to the Yazidi community worldwide · Development environment: Windows PC · Approach: Claude Code assisted development · Budget ceiling: €5,000 · Launch: gradual development and release.
**Mission:** a comprehensive digital ecosystem dedicated to Yazidis worldwide, connecting people, families, generations, communities, culture, education, businesses and social activities. EZIDNET is not a traditional family tree application.

## 2. Core technology
Next.js · TypeScript · PostgreSQL · Supabase Auth · Supabase Storage · responsive web application · PWA-first · Cytoscape.js for relationship visualization · Git and GitHub · future Android and iOS apps using shared APIs and types. One unified backend and database for all applications.

## 3. Main platform centers
1 Identity — digital identity and personal profiles · 2 Network — relationships, people and communities · 3 Social — feed, messages, social interaction · 4 Heritage — history, culture, language, cultural preservation · 5 Business — marketplace, companies, services, employment · 6 Creator — video, interviews, livestreaming, creator monetization · 7 Knowledge — education, research, AI, mentorship · 8 Services — help, events, travel, tickets, volunteering · 9 EZID Kids — educational and entertainment environment for Yazidi children.

## 4. EZID Kids — official approved module
A major independent section inside EZIDNET with a child-friendly interface, separate navigation and parental controls.
**Mission:** help Yazidi children discover and learn about their culture, heritage, language, history and community through safe educational experiences, interactive games, stories and creative activities.

### 4.1 Main sections
- **A. EZID Learning:** introduction to Yazidi identity and culture · traditions and customs · festivals and celebrations · cultural symbols and meanings · values (respect, cooperation, coexistence) · age-appropriate lessons.
- **B. EZID Languages:** Kurmanji learning · letters, vocabulary, pronunciation · everyday conversations · songs and educational audio · Arabic, German and English as supporting languages.
- **C. EZID Games (original):** EZID Puzzle (cultural picture puzzles) · EZID Memory (memory and matching) · EZID Alphabet (Kurmanji letters and vocabulary) · EZID World Explorer (geography and cultural exploration) · EZID Coloring · EZID Quiz (age-appropriate cultural quizzes) · Build an EZID Village (village-building) · EZID Adventures (educational adventures inspired by nature and cultural heritage).
- **D. EZID Stories:** illustrated stories · audio stories · age-appropriate cultural tales · stories teaching honesty, cooperation, kindness, courage · bedtime stories with adjustable narration speed and volume.
- **E. EZID Creative Studio:** drawing and coloring · cultural patterns and designs · traditional clothing illustrations · creative projects · child-friendly art activities.
- **F. EZID Discovery:** interactive maps · cultural landmarks · geography and nature · educational journeys · historical discovery adapted to age.
- **G. EZID Kids AI (supervised):** age-appropriate answers · Kurmanji vocabulary · cultural explanations · reads stories aloud · quizzes · pronunciation help · approved knowledge base and age-appropriate responses.
- **H. EZID Achievements:** learning levels · stars and rewards · badges · progress reports · certificates.

### 4.2 Age groups
3–5: images, sounds, colors, simple games, songs · 6–8: letters, words, stories, puzzles, basic cultural knowledge · 9–12: language, history, geography, quizzes, creative projects · 13–16: deeper cultural learning, research, history, independent projects. Content and interface complexity adapt to each group.

### 4.3 Parental Control Center
Every child account is associated with an authorized parent or guardian: parental consent and account management · age and learning-level settings · language selection · content approval · progress reports · screen-time limits · permission management · AI interaction controls · disable individual activities · child privacy settings. No unrestricted private messaging with strangers. No public exposure of children's personal information or precise location. No use of children's data for targeted advertising.

### 4.4 Cultural and educational review
Reviewed by qualified contributors · sources identified for historical information · documented facts distinguished from oral traditions and differing interpretations · respect for diversity within the Yazidi community · disputed interpretations not presented as universally accepted · no graphic or traumatic historical content for young children · age-appropriate explanations for sensitive subjects.

### 4.5 Future standalone application
Designed to become a standalone Android/iOS app later, connected to the unified identity and backend with separate child-safe permissions and interfaces. No separate database for the Kids app.

## 5. Digital identity
One account and one digital identity per person · unique EZID ID · secure personal QR code · profile photograph · personal, family, professional and social identity · multiple roles · independent verification statuses · configurable field-level privacy. QR scanning creates a connection request, never a confirmed relationship. Identity verification, family relationship confirmation and professional verification are separate processes.

## 6. Relationship network
Graph model, not a hierarchical tree: one person one node · multiple relationship types · relationships as edges · request and confirmation workflow · proposed, confirmed, rejected and disputed statuses · relationship history and audit trail · How Are We Connected? · Family Circles · relationship privacy controls. Only confirmed relationships are used for confirmed relationship-path calculations.

## 7. Social and community features
Home Dashboard · Social Feed · Communities · Messages · Discover · People Directory · Global Map · Events & Calendar · Notifications · Family History · Family Vault · Life Timeline · My Life Map · My Legacy Story · Family Organizer · Family Documents · Family Reunion · Family Knowledge · Global Communities · Language Exchange · Mentorship Network · Ask the Community · Interest Circles · Trusted Contacts · Account Legacy · Family Care.

## 8. Video and creator features
Only two video sections: 1 Public Videos · 2 Family Videos. Do not create My Video Archive. Do not create Friends Videos.
Creator features: Celebrity & Live · Interview Studio · Webinars · Content Production Hub · Creator Studio · creator collaboration · Live Gifts · Paid Live · Memberships · Sponsored content · Creator Earnings Dashboard · FN Originals may be considered as a media brand within the platform. Livestream recording and publishing follow consent, privacy and copyright requirements.

## 9. Business and economy
EZID Market · Personal Stores · Business Stores · Services Marketplace · Business Connections · Business Partner Finder · Startup Hub · Career Opportunities · EZID Jobs · creator monetization · Bookings · Tickets · sponsorships and partnerships · Earnings Dashboard · FN Coins concept subject to legal and financial review. Payments use suitable providers; never store card details or hold seller funds without an appropriate legal arrangement.

## 10. Culture and knowledge
EZID Heritage · cultural preservation · Oral History · Historical Timeline · language learning · digital cultural resources · EZID Academy · Knowledge Network · research and educational resources · AI Family Historian · Universal Translator · EZID World.

## 11. AI services
EZID AI Assistant · Family AI Assistant · AI Career Assistant · Universal Translator · AI Family Historian · Document Assistant · Assistant Voice · Recommendations. AI must not independently make serious identity, relationship, safety or moderation decisions without human review.

## 12. Security and privacy
GDPR-aware architecture · server-side authorization · database access policies · encryption of sensitive information · secure QR tokens · rate limiting · audit logs · data export and deletion · backups · separate secure storage for identity documents · data minimization · protection of children's data · parental consent and child-safe defaults. Do not infer religious or ethnic identity from names, photographs, family relationships or locations. Any processing of sensitive personal data needs an appropriate legal basis and legal review.

## 13. Design system
Modern Luxury / Editorial Minimalism. Suggested colors: Warm Sand #F3F0E9 · Pale Beige #E9E5DC · Soft Cream #FAF9F5 · Deep Graphite #30302D · Stone Gray #858078 · Muted Terracotta #B58F7B · Dusty Olive #989985 · Soft Gold #C9A34F. Elegant, modern, accessible · responsive · Arabic RTL · Kurmanji, German and English localization · consistent design system · separate child-friendly EZID Kids visual identity · no excessive gradients, neon or distracting effects.

## 14. MVP — first release
1 Registration and login · 2 Personal profiles · 3 Digital identity · 4 EZID ID · 5 Secure QR codes · 6 Relationship graph engine · 7 Relationship requests and confirmation · 8 People search · 9 Privacy and permissions · 10 Basic administration dashboard · 11 Four primary languages · 12 Responsive website and PWA.
EZID Kids is in the master architecture and roadmap from the beginning; full implementation after the core foundation. Plan the Kids data model, parental consent architecture, age groups, content approval and child-safe permissions before implementation.

## 15. Required documentation
docs/PROJECT_VISION.md · docs/ARCHITECTURE.md · docs/DATABASE_SCHEMA.md · docs/RELATIONSHIP_ENGINE.md · docs/SECURITY_AND_PRIVACY.md · docs/LOCALIZATION.md · docs/ROADMAP.md · docs/TEST_PLAN.md · docs/DEPLOYMENT.md · docs/DECISIONS.md · docs/EZID_KIDS_SPECIFICATION.md · docs/EZID_KIDS_SAFETY.md · docs/EZID_KIDS_EDUCATIONAL_CONTENT.md · docs/EZID_KIDS_GAMES.md

## 16. Development roadmap
1 Project foundation and architecture · 2 Registration, identity and profiles · 3 Relationship graph and people discovery · 4 Privacy, administration and testing · 5 Initial public website and PWA release · 6 Social and community services · 7 EZID Kids educational platform, games and parental controls · 8 Heritage, business, creator and knowledge services · 9 Android and iOS applications · 10 Global expansion and additional services.

## 17. Explicitly excluded features
My Digital Passport · My Proof · Project Hub · Company Directory · FN Magazine · My Video Archive · Friends Videos. No alternative names to bypass these exclusions.

## 18. Development and approval rules
Modular, maintainable TypeScript · avoid unnecessary dependencies · keep secrets out of Git · maintain README.md and .env.example · meaningful tests · document architectural decisions · never overwrite or delete files without permission · do not purchase services or deploy without permission · small, reviewable phases · approval before major implementation milestones.

## 19. First task for Claude Code
Inspect the repository. Update documentation and architecture to Version 1.1. Integrate EZID Kids into the master product map, system architecture, roadmap, database planning, privacy and safety architecture, screen map and testing strategy. Produce the complete EZID Kids specification and proposed data model. Do not implement all features immediately. **STOP after preparing the updated documentation and present architecture, screen map, database changes, roadmap and implementation recommendations for approval.**
