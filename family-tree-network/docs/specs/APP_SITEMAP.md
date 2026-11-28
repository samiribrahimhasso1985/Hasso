# FAMILY NETWORK — Complete App Sitemap & Functional Specification

> Version 1.0 · Source: product owner · Stored verbatim in structure (CLAUDE.md §27).

## App structure

**Primary areas:** Home · My Network · Discover · Messages · My Profile · Digital ID

**Services & sub-sections:** Communities · Memories · Events · Global Map · Family AI · People Directory · Family History · Family Vault · Privacy Center · Settings

---

## 01 — AUTHENTICATION & ONBOARDING
**Screens:** Splash Screen · Welcome Screen · Create Account · Login · Phone Number Verification · SMS OTP Verification · Identity Verification · Create Password · Forgot Password · Account Recovery · Profile Setup · Choose Language · Privacy Introduction · Terms & Conditions · Onboarding Complete

**Registration fields:** Legal name · Display name · Date of birth · Country · Phone number with country code · Email address · Password · Identity document type · Identity verification status · Profile photograph

**Requirements:** International phone number support · SMS OTP verification · Secure authentication · Configurable identity verification provider · Never expose government ID information to other users · Age and guardian-consent workflows · GDPR compliance.

Detailed registration flow: [SMART_IDENTITY_REGISTRATION.md](SMART_IDENTITY_REGISTRATION.md) · Profile photo: [PROFILE_PHOTO.md](PROFILE_PHOTO.md)

## 02 — HOME DASHBOARD
**Screens:** Home · Activity Overview · Recent Connections · Suggested People · Recent Posts · Upcoming Events · Recent Memories · Community Updates · Quick Actions

**Quick actions:** Add Person · Scan QR · My Digital ID · Create Post · Create Community · Add Memory · Create Event

## 03 — MY NETWORK
**Screens:** Network Overview · Relationship Graph · Family Connections · Friends Connections · Professional Connections · Social Connections · Custom Connections · Shared Connections · Relationship Requests · Pending Requests · Accepted Relationships · Rejected Requests · Disputed Relationships · Relationship History · Relationship Details · How Are We Connected? · Relationship Verification

**Functions:** Add a person · Select relationship type · Submit relationship request · Accept or reject request · Correct relationship type · Request relationship verification · Display shared connections · View connection path · Remove or disconnect a relationship.

**Architecture rule:** One person must have one unique account and one unique person record. Multiple relationship edges may connect the same person to different people. Never duplicate a person to represent different branches.

## 04 — DIGITAL IDENTITY
**Screens:** My Digital ID · Family ID Details · My QR Code · QR Scanner · Scanned Profile Preview · Select Relationship · Add Relationship Message · Send Connection Request · Request Status · QR Settings · Regenerate QR · Revoke QR

**Security:** QR must use a secure random token · QR must not contain personal identity information · Tokens support expiration and revocation · Scanning never automatically establishes a relationship · The receiver must approve the request · Rate limits and abuse detection are mandatory. (Full rules: CLAUDE.md §24.)

## 05 — DISCOVER
**Screens:** Discover Home · People Discovery · Communities Discovery · Public Pages · Interest Categories · Mutual Connections · Suggested Connections · Search Results · Advanced Search · Discovery Preferences

**Search filters:** Name · Country · City (if shared) · Language · Shared interests · Shared communities · Relationship distance · Professional category. Respect privacy and discoverability settings.

## 06 — SOCIAL FEED
**Screens:** Global Feed · My Feed · Family Feed · Friends Feed · Community Feed · Create Post · Edit Post · Post Details · Comments · Replies · Reactions · Saved Posts · Shared Posts · Report Post

**Post types:** Text · Image · Video · Multiple images · Life event · Announcement · Memory · Public update

**Visibility:** Public · Connections · Family · Friends · Selected people · Private. Every post stores its visibility and the backend enforces it.

## 07 — COMMUNITIES
**Screens:** Communities Home · My Communities · Discover Communities · Create Community · Community Details · Community Feed · Community Members · Member Profile · Invitations · Join Requests · Admin Dashboard · Community Settings · Community Roles · Community Rules · Report Community

**Types:** Family · Friends · Professional · Local · Interest-based · Public · Private
**Roles:** Owner · Administrator · Moderator · Member · Guest

## 08 — MESSAGES
**Screens:** Inbox · Direct Messages · Group Chats · Conversation Details · Shared Media · Shared Files · Message Requests · Archived Conversations · Blocked Contacts · Chat Settings

**Features:** Text messages · Image sharing · Video sharing · File attachments · Voice messages · Message replies · Reactions · Read receipts · Typing indicators · Mute conversations · Block and report. Evaluate end-to-end encryption before production launch.

## 09 — MEMORIES & ARCHIVE
**Screens:** Memories Home · Photo Gallery · Video Archive · Voice Recordings · Family Albums · Shared Albums · Create Album · Upload Media · Memory Details · Memory Timeline · Tagged People · Archive Search · Archive Permissions

**Features:** Upload and organize media · Tag people · Attach dates and descriptions · Create shared albums · Search memories · Set access permissions · Download and export permitted content.

## 10 — EVENTS & CALENDAR
**Screens:** Calendar · Upcoming Events · Create Event · Event Details · Invitations · Attendees · Event Discussion · Birthday Calendar · Family Gatherings · Event Notifications

**Categories:** Birthday · Wedding · Engagement · Newborn · Family Gathering · Anniversary · Memorial · Personal Achievement. Sensitive announcements require appropriate authorization.

## 11 — GLOBAL MAP
**Screens:** Global Overview · Countries · Cities · Connected People · Community Locations · Location Preferences

**Privacy:** Location sharing disabled by default · Country-level visibility · Optional city-level visibility · No precise home addresses · Users can stop location sharing at any time.

## 12 — FAMILY AI
**Screens:** AI Home · Ask Family AI · Relationship Assistant · Connection Analysis · Memory Search · Archive Assistant · Suggested Corrections · AI Activity History · AI Privacy Settings

**Capabilities:** Natural language search · Find people in permitted records · Suggest possible relationship connections · Organize memories · Transcribe audio with permission · Identify potential duplicate profiles · Help construct a family timeline.

AI must never automatically confirm sensitive relationships or legal identity. All suggested changes require human approval.

## 13 — PEOPLE DIRECTORY
**Screens:** All Contacts · Family Directory · Friends Directory · Professional Directory · Recently Added · Favorites · Custom Lists · Contact Details · Personal Notes. Personal notes remain private unless explicitly shared.

## 14 — FAMILY HISTORY
**Screens:** Family History Home · Historical Timeline · Generations · Historical Photos · Historical Documents · Family Stories · Sources & References · Contributions · Review Submissions. Clearly distinguish verified information from unverified family stories.

## 15 — FAMILY VAULT
**Screens:** Vault Home · Documents · Private Photos · Important Records · Shared Family Documents · Access Permissions · Access History · Vault Security. Use encryption, access controls, secure backups and audit logs. Do not store sensitive identity documents without a clearly justified purpose and lawful retention policy.

## 16 — LIFE TIMELINE
**Screens:** My Timeline · Add Life Event · Edit Life Event · Milestone Details · Family Timeline · Shared Timeline
**Event types:** Birth · Education · Work · Marriage · Travel · Moving · Achievements · Other personal milestones

## 17 — NOTIFICATIONS
**Screens:** Notification Center · Relationship Requests · Family Updates · Friend Updates · Community Notifications · Event Reminders · Notification Preferences · Quiet Hours. Intelligent prioritization; respect muted users, blocked users, privacy preferences and frequency limits.

## 18 — PROFILE & SETTINGS
**Profile screens:** My Profile · Edit Profile · Profile Preview · My Posts · My Connections · My Communities · My Memories · My Events · My Digital ID
**Settings screens:** Account Settings · Security · Privacy Center · Blocked Users · Language · Appearance · Notification Preferences · Connected Devices · Data Export · Delete Account · Subscription · Help Center · Contact Support · Terms & Privacy Policy

## 19 — ADMINISTRATION PLATFORM
Separate secure web-based administration dashboard.

**Screens:** Admin Login · Dashboard · User Management · Identity Verification Queue · Reports & Moderation · Community Management · Content Moderation · Abuse Detection · Suspicious QR Activity · Platform Analytics · System Health · Audit Logs · Role & Permission Management · Support Tickets · Configuration

Administrative access is role-based and fully audited. Administrators must not have unrestricted access to private messages, private memories or private vault contents.

## 20 — GLOBAL NAVIGATION
**Mobile bottom navigation (5):** Home · My Network · Discover · Messages · Profile. A central Create action may be a prominent contextual action without adding a sixth destination.

**Desktop left sidebar:** Home · My Network · Discover · Social Feed · Communities · Messages · Memories · Events · Global Map · Family AI · People Directory. **Bottom of sidebar:** My Profile · Settings · Help. **Right panel:** Upcoming events · Relationship requests · Suggested people · Recent activity.

## 21 — CORE PRODUCT RULES
- A user has one unique identity.
- A person can have multiple relationship types.
- Relationships require appropriate confirmation.
- QR scanning does not automatically create a relationship.
- Every sensitive field respects privacy permissions.
- Public and private content are separated at backend authorization level.
- Children receive enhanced privacy protection.
- Users can export and delete their data according to applicable law.
- All important account and relationship changes are auditable.
- AI suggestions remain distinguishable from confirmed facts.

## 22 — DEVELOPMENT PRIORITIES
- **Release 1 — Core Platform:** Authentication · User profiles · Digital ID · QR scanner · Relationship engine · Relationship graph · Connection requests · Privacy center
- **Release 2 — Social Platform:** Social feed · Posts and comments · Discover · Communities · Messages · Notifications
- **Release 3 — Personal Archive:** Memories · Events · Life timeline · People directory · Family history
- **Release 4 — Advanced Platform:** Family AI · Global map · Family Vault · Advanced analytics · Subscription system
- **Release 5 — Production & Global Expansion:** Security audits · Performance optimization · Accessibility · Localization · GDPR review · App Store and Google Play preparation

## Final implementation instruction
Before writing implementation code: inspect the repository · review existing code and architecture · map existing functionality to this sitemap · identify missing modules · create a technical implementation plan · implement modules incrementally · test each module before moving forward · never replace working functionality without approval.

The application must be modular, scalable, responsive, multilingual and privacy-first. Do not build all modules simultaneously. Start with the foundation and relationship engine, then expand according to the release priorities.
