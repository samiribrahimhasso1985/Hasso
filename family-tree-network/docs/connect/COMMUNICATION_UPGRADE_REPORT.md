# EZIDINET CONNECT — Global Communication Upgrade: audit & report (2026-11-28)

Spec: [`../specs/EZIDINET_CONNECT_COMMUNICATION_UPGRADE.md`](../specs/EZIDINET_CONNECT_COMMUNICATION_UPGRADE.md)

## 1. Audit — what exists in the code (verified, not assumed)
| System | Status |
|---|---|
| Friends, requests, followers, mutual friends | ✅ (FRIENDSHIP relationships — one system) |
| Live presence (online/busy/away/invisible, last seen) | ✅ heartbeat every 60 s (not yet real-time push) |
| Notifications (in-app centre, categories, quiet hours, DND) | ✅ one service for all modules |
| QR Connect | ✅ scan → request only |
| Blocking | ✅ everywhere | 
| Discovery | ✅ name search + suggestions — **but languages could not be entered anywhere in the UI** (fixed now) |
| Events & ÊZÎDÎ Calendar | ✅ (new today) |
| **Messenger, voice messages** | ❌ not built |
| **Voice & video calls, group calls** | ❌ not built |
| Groups / circles | 🟡 `communities` tables only, no API/UI |
| Language partner, global meetups, social podcast | ❌ (meetups can use Events) |
| Reports, appeals, anti-scam/spam tools beyond rate limits | ❌ |
| Duplicates found | none in code; friend requests appear in two screens (Inbox + Friends) — same records |

## 2. The 15 improvements
| # | Improvement | Status | Notes |
|---|---|---|---|
| 1 | Smart Unified Inbox | 🟡 | notification centre unifies requests, follows, events; **messages need the Messenger** |
| 2 | Instant Connect | ✅ | from profile card: friend request / follow in one tap, also from events (organizer, participants) |
| 3 | One-Tap Voice & Video | ❌ | needs calls (D-C1 WebSocket, D-C2 TURN ~€5/month) |
| 4 | Live Presence | 🟡 | works (60 s heartbeat); real-time updates come with the WebSocket |
| 5 | Universal Conversation | ❌ | Messenger |
| 6 | Connect Discovery | ✅ **new** | languages (now editable), declared interests and skills, each with its own audience; filters; reasons shown; only PUBLIC fields used; nothing inferred |
| 7 | Personal Social Circles | ❌ | will be built on `communities` (no second groups system) |
| 8 | Instant Group Meet | ❌ | calls |
| 9 | Shared Conversation Space | ❌ | Messenger |
| 10 | Voice Introduction | ❌ | needs file storage (D-C3) |
| 11 | Smart Conversation Scheduling | 🟡 | events can be used for meetings today; scheduling inside chats needs the Messenger |
| 12 | Advanced Contact Permissions | 🟡 | who may send friend requests, follow, see presence, see friend list ✅; **who may message / call / invite to groups** will be added together with those features (no switches for features that do not exist) |
| 13 | Secure Conversations | 🟡 | TLS, sessions, blocks, rate limits ✅; **no E2EE claimed** — planned as a separate tested milestone |
| 14 | Accessible Communication | 🟡 | 4 languages, RTL, keyboard focus, screen-reader labels, reduced motion; voice-to-text **removed by owner decision** |
| 15 | Seamless Multi-Device | 🟡 | same account on phone/desktop/APK; server-side data; live sync needs the WebSocket |

Contact entry points (§3): profile card ✅ · friends list ✅ · member directory (Discover) ✅ · event pages ✅ (new) ·
groups, initiatives/projects, creators/professionals ❌ (those sections do not exist yet).

## 3. Technical changes in this step
- Migration `declared_interests_skills`: `profiles.interests`, `profiles.skills` (text arrays) + privacy fields `INTERESTS`, `SKILLS` (rollback SQL in `rollback/`).
- `PATCH /profiles/:id` accepts `languages` (ISO codes), `interests`, `skills` (normalised: trimmed, lower case, unique, ≤20).
- `GET /connect/discover?lang=&interest=&skill=` — filters only on fields the person shows publicly; suggestions also rank by shared public languages/interests/skills and explain why.
- Web: "How others can find me" in Friends → Privacy (discoverable switch, languages, interests, skills, audience per field); discovery filters; members can be opened from event pages.

## 4. Tests
API 97/97 (new: discovery by declared fields incl. privacy and validation) · web 18/18 · e2e 15/15 (new: two accounts — one declares in the UI, the other finds by skill on a phone, privacy change hides the result, then reaches the member from an event page and sends a friend request).

## 5. External services & costs
None used in this step. The Messenger/calls items need: WebSocket (free), file storage (Cloudflare R2: free up to 10 GB), TURN (~€5/month). Translation and transcription were removed by the owner.
