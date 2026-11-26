# FAMILY NETWORK — Master Expansion: Complete Platform Specification

> Version 2.0 — Global Social, Family & Identity Ecosystem. Source: product owner. Stored as CLAUDE.md §31.
> Where this document and older sections disagree, **this version wins** (see the reconciliation in
> `FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md` §4).

## 1. Project vision
A global, interconnected digital platform combining: digital identity · verified people · family, social and professional relationships · family communities · social networking · public videos · private family videos · celebrity profiles · celebrity interviews · live streaming · family memories · family history · global family map · events and reunions · artificial intelligence · trust and safety · professional accounts · premium services.

One integrated platform, not disconnected applications. Every user has ONE account, ONE internal identity and ONE profile. Every module integrates with the central identity, relationship, permission and notification systems.

## 2. Mandatory project rules
Before implementation: inspect the repository, CLAUDE.md, database schemas and current screens. Preserve all approved decisions.
1. No traditional hierarchical family tree as the primary relationship architecture.
2. Relationship graph: people are nodes, relationships are edges.
3. Each person has one unique internal account identity.
4. Multiple relationship types.
5. Government identity verification is separate from relationship confirmation.
6. Only administrators approve official verified badges.
7. Public and private videos have separate access policies.
8. Do not create **My Video Archive**.
9. Do not create **Friends Videos**.
10. Do not create alternative personal video storage sections.
11. Videos belong to the **Public Videos** or **Family Videos** sections.
12. Private family content never becomes public automatically.
13. AI never confirms family relationships without appropriate human confirmation.
14. Preserve Arabic RTL and German/English LTR.
15. Follow the approved **Modern Luxury / Editorial Minimalism** design system.

## 3. Global application structure
- **A. Core identity & relationships:** 1 Digital Identity · 2 Family ID · 3 Smart QR Identity · 4 Profile Management · 5 Verified Accounts · 6 Relationship Network · 7 How Are We Connected? · 8 People Directory · 9 Professional Relationships · 10 Family Invitations
- **B. Social platform:** 11 Social Feed · 12 Public Posts · 13 Comments and Reactions · 14 Communities · 15 Family Communities · 16 Discover · 17 Messages · 18 Notifications · 19 Follow System · 20 Content Sharing
- **C. Family services:** 21 Family Events · 22 Family Reunion · 23 Family Memories · 24 Life Timeline · 25 Family History · 26 Family Legacy · 27 Family Map · 28 Family Passport
- **D. Video and media:** 29 Public Videos · 30 Family Videos · 31 Video Discovery · 32 Video Comments · 33 Video Reactions · 34 Video Recommendations — *only Public Videos and Family Videos are separate video sections.*
- **E. Celebrity and broadcasting:** 35 Celebrity Profiles · 36 Official Public Figures · 37 Verified Badge · 38 Request an Interview · 39 Interview Management · 40 Celebrity Studio · 41 Live Streaming · 42 Multi-Guest Broadcasting · 43 Audience Interaction · 44 Broadcast Moderation
- **F. Artificial intelligence:** 45 Family AI · 46 Relationship Assistant · 47 Family History Assistant · 48 Smart Event Assistant · 49 Multilingual Communication · 50 Media Organization Assistant
- **G. Security and business:** 51 Trust Center · 52 Verification Center · 53 Privacy Center · 54 Admin Dashboard · 55 Business Accounts · 56 Professional Profiles · 57 Premium Subscriptions · 58 Analytics · 59 Global Platform Administration

## 4. Relationship Network 2.0
Interactive graph; people are nodes, relationships are edges. Types: parent · child · sibling · spouse · partner · grandparent · grandchild · uncle · aunt · cousin · other family · friend · professional colleague · business partner · acquaintance · custom.
Every relationship has: type · direction where relevant · initiating user · confirmation status · created date · privacy permissions · optional supporting evidence · **relationship history**.
Statuses: Pending · Confirmed · Rejected · Disputed · **Removed**. An invitation never automatically becomes a confirmed relationship.
**How Are We Connected?** shows the confirmed path, relationship names, intermediate people and connection depth; never private or unconfirmed relationships without authorization.

## 5. Family communities
Dedicated family community page: family name · family identity · members · administrators · announcements · posts · events · memories · family videos · history · timeline · invitations · privacy settings.
Roles: Family Owner · Family Administrator · Editor · Member · Viewer. A family administrator does not automatically access members' private personal content. Private and invitation-only communities.

## 6. Social feed
Post types: text · images · public videos · family videos in authorized family contexts · events · announcements · questions · shared memories.
Features: likes · reactions · comments · replies · sharing · reporting · editing · deletion · audience selection.
Visibility: Public · Connections · Family · Selected people · Private · Community — enforced at backend level.

## 7. Public Videos and Family Videos
**Public Videos:** upload · player · discovery · categories · search · comments · reactions · sharing · creator profiles · reporting · moderation.
**Family Videos (private family sharing):** family event videos · birthdays · weddings · reunions · childhood memories · celebrations · shared family albums · selected family-member access.
Each video has its own access policy: authorized viewing · optional download permission · comments where enabled · removal requests · reporting · secure media delivery. No personal video archive, no friends videos section.

## 8. Celebrity and verified public figures
Official profiles for actors, singers, musicians, athletes, journalists, media personalities, academics, experts, public figures, content creators.
**FAMILY NETWORK VERIFIED BADGE:** official symbol that the administration checked the owner's identity; shown beside the name; on click:
- AR: "تم تأكيد هوية صاحب هذا الحساب من إدارة FAMILY NETWORK."
- EN: "This account owner's identity has been verified by FAMILY NETWORK."
Rules: mandatory manual administrator approval · no automatic activation · no self-uploaded badges · no payment-based verification · verify identity and account ownership · check representatives' authorization · review and appeal history · authorized admins can suspend/revoke · every decision audited. The badge verifies identity — not opinions, credibility of every statement, qualifications or endorsement.

## 9. Request an Interview
Fields: title · topic · purpose · preferred date · preferred time · duration · format (private interview / public live interview / recorded interview) · additional message · optional links.
Workflow: REQUESTED → UNDER_REVIEW → ACCEPTED → SCHEDULED → COMPLETED; alternatives REJECTED · ALTERNATIVE_PROPOSED · CANCELLED · EXPIRED.
Celebrity can accept, reject, suggest another date, ask for more information, disable requests, define availability, manage upcoming interviews. Private interviews stay private unless participants explicitly approve public broadcasting. (Details: `VERIFIED_ACCOUNTS_AND_LIVE.md` §27.17.)

## 10. Celebrity Studio
Sections: overview · public profile · verification status · interview requests · interview calendar · upcoming interviews · live broadcasting · audience · content performance · notifications · account settings.
Analytics: profile views · followers · interview requests · attendance · video views · live viewers · engagement — **only metrics supported by actual platform data**.

## 11. Live streaming platform
Mobile and desktop broadcasting · RTMPS input · WebRTC interactive sessions · HLS playback · multi-guest · live chat · questions · reactions · moderators · audience controls · reports · optional recording · quality monitoring. Permissions depend on eligibility and law.
Safety: community guidelines · copyright controls · abuse reporting · moderator actions · emergency termination · account restrictions · appeals · audit logs · child safety. Never launch public live streaming without operational moderation, reporting and emergency controls.

## 12. Family events
Types: birthdays · weddings · engagements · anniversaries · family reunions · religious or cultural gatherings · graduations · memorial events · custom.
Features: create · invite · RSVP · guest list · privacy · date and time · location · map · reminders · announcements · optional family videos · optional photos. Private and public events. Private event locations never exposed without authorization.

## 13. Family reunion
Create reunion · invite relatives in different countries · attendance confirmation · online participation · meeting links · schedule · announcements · program · optional live stream · photos and videos. Hybrid physical/online.

## 14. Life timeline
Birth · education · graduation · employment · marriage · achievements · relocation · family milestones · user-defined. Visibility per entry; nothing exposed automatically.

## 15. Family memories
Family stories · photographs · public and private memories · event memories · childhood memories · comments · date-based organization · member contributions. Linked to people, family communities and events. No separate personal video archive.

## 16. Family history and family legacy
Historical records · stories · generational connections · historical locations · migration history · important events · source references · document attachments · review and correction requests.
**Family Legacy:** stories, achievements, knowledge and history for future generations, with explicit sharing and future-stewardship permissions. Never invent historical relationships or present unverified claims as facts.

## 17. Family Passport
Digital identity card: display name · Family ID · profile picture · QR · verification status · public profile link · selected relationship information where authorized. No government ID numbers. The user chooses visible information when sharing. QR uses secure revocable tokens; scanning creates a profile visit or connection request, never a confirmed relationship.

## 18. Global family map
Distribution by country · communities by region · historical locations · migration history · optional event locations · location-based connections. Never exact home addresses; approximate/country level; explicit permission; users can hide their map presence.

## 19. Professional network
Professional biography · skills · work experience · education · business affiliation · professional connections · invitations · optional business contact details. Kept distinct from family relationships. (Extended by §32 Professional Identity.)

## 20. Business accounts
Companies · organizations · institutions · media organizations · approved professional entities. Official organization profile · organization verification · multiple authorized administrators · announcements · public videos · event publishing · professional contact details · audience analytics. Organization verification ≠ personal identity verification.

## 21. Family AI
**Relationship Assistant:** explain confirmed relationships · find paths · help understand the network · identify missing confirmation steps.
**Family History Assistant:** organize records · summarize user-approved stories · help create timelines · suggest missing historical information.
**Event Assistant:** suggest schedules · organize reunions · create invitations · send reminders with permission.
**Media Assistant:** suggest video categories · generate titles and descriptions · organize permitted memories · assist permitted searches.
**Multilingual:** Arabic, German, English, more via localization.
Privacy: never expose private family information · never confirm relationships · never publish automatically · never modify permissions without approval · never train on private family content without authorization and consent.

## 22. Trust & Safety Center
Identity verification · impersonation reporting · account security · login session management · privacy controls · block lists · content reports · relationship disputes · video reports · live moderation · appeals · data export · account deletion · audit logs. GDPR and other laws; additional protections for minors.

## 23. Administrative platform
Roles (limited permissions each): Super Administrator · Identity Verification Administrator · Content Moderator · Live Moderator · Family Support Administrator · Technical Administrator · Billing Administrator.
Features: user management · Verification Center · Report Center · Live Control Center · content moderation · relationship disputes · family community moderation · subscriptions · analytics · audit logs · appeals. No unrestricted access to private content without valid operational reason and access controls.

## 24. Premium and revenue model
**Family Premium** (advanced family management, history features, media capacity, event organization) · **Celebrity Studio Pro** (streaming tools, audience analytics, interview tools) · **Professional Accounts** (business profiles, organization management, analytics) · **Business Accounts** (organization features, multiple managers, official announcements).
Rules: basic identity and essential security always free · payment never guarantees verification · never sell private family data · clear subscription and billing terms.

## 25. Global search and discover
People · family communities · public profiles · verified public figures · public videos · public events · professional accounts · organizations. Results respect privacy; never expose private profiles, private relationships or private media.

## 26. Design system — Modern Luxury / Editorial Minimalism
Colors: Warm Sand `#F3F0E9` · Pale Beige `#E9E5DC` · Soft Cream `#FAF9F5` · Deep Graphite `#30302D` · Stone Gray `#858078` · Warm Gray `#DDD8CE` · Muted Terracotta `#B58F7B` · Dusty Olive `#989985` · Slate Blue Gray `#87939A` · Soft Cocoa `#A18D80`.
Rules: no neon · no saturated color overload · no excessive gradients · no excessive glow · generous white space · subtle shadows · thin borders · rounded cards · clean typography · consistent icons · responsive.
Typography: Arabic IBM Plex Sans Arabic or Noto Sans Arabic; German/English Inter. RTL, LTR, responsive web, Android, iOS, accessibility. The verified badge may use its official blue as a controlled status indicator.

## 27. Main navigation
Bottom navigation: Home · My Network · Discover · Messages · Profile. A separate **More Services** screen or contextual navigation for: Videos · Families · Events · Memories · Family History · Interviews · Live · Celebrity Studio · Global Map · Family AI · Trust Center · Professional Network. Do not overload the bottom navigation.

## 28. Technical architecture
Next.js + TypeScript (web) · Flutter (Android, iOS) · NestJS · PostgreSQL · Prisma · WebSockets · object storage · CDN · Docker · CI/CD · centralized monitoring · modular monolith with clear service boundaries; no microservices without demonstrated need.
Backend domains: Identity · Users · Profiles · Relationships · Families · Social · Communities · Messaging · Videos · Events · Interviews · Live Streaming · Verification · Moderation · AI · Notifications · Billing · Administration.

## 29. Implementation roadmap
- **R1 Core Platform:** Registration · Digital Identity · Profile Photo · Phone Verification · Identity Verification · Family ID · QR · Relationship Engine · Relationship Graph · Connection Requests · Privacy · Admin Verification Center
- **R2 Social Platform:** Social Feed · Profiles · Communities · Family Communities · Messaging · Notifications · Global Search · Discover
- **R3 Family Services:** Family Events · Family Reunion · Family Memories · Life Timeline · Family History · Family Legacy · Family Passport · Global Family Map
- **R4 Video Platform:** Public Videos · Family Videos · Secure Upload · Video Player · Video Discovery · Comments · Reactions · Media Moderation
- **R5 Celebrity Platform:** Verified Public Figures · Celebrity Profiles · Request an Interview · Interview Scheduling · Celebrity Studio · Private Video Interviews
- **R6 Live Broadcasting:** Live Streaming · Multi-Guest · Live Chat · Moderators · Reporting · Emergency Controls · Recording Consent · Broadcast Analytics
- **R7 Family AI:** Relationship Assistant · History Assistant · Event Assistant · Media Organization · Multilingual Communication
- **R8 Business and Global Expansion:** Professional Accounts · Business Accounts · Premium Subscriptions · Advanced Analytics · Global Localization · Performance · Accessibility · Security Audit · Store Deployment

## 30. Implementation rules for Claude Code
Before code: read CLAUDE.md · inspect repository · review modules · review database · identify implemented and missing features · detect duplicates · preserve functionality · create an implementation matrix · update documentation · propose a technical plan.
For every module define: requirements · user journeys · UI screens · backend services · database changes · API endpoints · authorization · security requirements · acceptance tests.
Never create placeholder buttons that do nothing. Never claim an integration works unless tested. Never finish a module without testing its main flows. Use migrations and keep backward compatibility.

## 31. Final acceptance criteria
Unified identity · global people and family relationships · verified public accounts · public and family video sections only · celebrity interviews · authorized live broadcasting · family events and reunions · family history and legacy · global family map · Family AI · professional and business accounts · central privacy and security controls · Arabic, German, English · web, Android, iOS · scalable foundation. Modular, secure, accessible, internationally adaptable.

**Final product principle:** FAMILY NETWORK IS A GLOBAL HUMAN CONNECTION PLATFORM. It connects people, families, communities, public figures and professional networks through one trusted digital identity.
