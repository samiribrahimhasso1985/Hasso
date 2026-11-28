# EZIDINET CONNECT — Implementation plan (tied to the existing code)

Specification: [`specs/EZIDINET_CONNECT_SPEC.md`](specs/EZIDINET_CONNECT_SPEC.md) · Date: 2026-11-28 · Status: **Phase 1 in progress**

## 1. What exists today (inspection)

| Area | Existing implementation | Consequence for CONNECT |
|---|---|---|
| Stack | npm workspaces: `apps/api` NestJS 10 + Prisma 5.22 + PostgreSQL 16 · `apps/web` Next.js 15 / React 19 · `packages/relationship-engine` · `apps/android` WebView shell | CONNECT is a new NestJS module (`src/connect`) and new web components — no new project. |
| Accounts & login | `users` (UUID), bcrypt, JWT with server-side `sessions` (`JwtGuard`), e-mail verification, login throttle | Reused unchanged; every CONNECT endpoint sits behind `JwtGuard`. |
| People | `profiles` (one per person; `user_id` for members, stewards for children / deceased), `searchable` flag (off by default), `is_minor`, per-field `privacy_settings` | Friends, followers and presence attach to **profiles of members** (`user_id` set). Minors are never discoverable, followable or requestable by strangers. |
| Relationships | `relationships` + append-only `relationship_verifications`; FRIENDSHIP category (`FRIEND`, `CLOSE_FRIEND`, `CHILDHOOD_FRIEND`, `SCHOOL_FRIEND`, `TRAVEL_FRIEND`); statuses PENDING / CONFIRMED / REJECTED / DISPUTED; request inbox `relationships/awaiting-me` | **Friendships are FRIENDSHIP relationships** (no second friendship table → no two conflicting systems, friends appear in the graph and in "How are we connected?"). |
| Blocking | `blocks` (user → profile), applied by the graph loader in both directions | Reused as `blocked_users`; CONNECT checks it on every action. |
| Communities | `communities`, `community_memberships` (OWNER / ADMIN / MEMBER, OPEN / APPROVAL / INVITE_ONLY) — schema only, no API yet | Phase 3 builds Groups **on this table** (adds MODERATOR, group chat) instead of a parallel `groups` table. |
| Audit | `audit_logs` via `AuditService` | All CONNECT actions are audited. |
| Real time | none (REST only) | Phase 1 presence uses a heartbeat; Phase 2 adds a WebSocket gateway used by messages, typing, presence and call signalling. |
| Files | profile photos stored in PostgreSQL (`profile_photos`, ≤ 2 MB) — owner decision §29 still open | Attachments (Phase 2) need the storage decision **D-C3** first. |
| Admin | no administrator role yet | Phase 2+ needs an `admin_roles` table and a limited, audited admin API (**D-C6**). |

## 2. Mapping of the requested tables

| Requested | Implemented as | Phase |
|---|---|---|
| users | existing `users` | — |
| friendships, friend_requests | existing `relationships` (FRIENDSHIP category) + `relationship_verifications`; request status derived: PENDING = pending relationship, ACCEPTED = confirmed, REJECTED = rejected, CANCELLED = withdrawn by the sender (row removed, recorded in `audit_logs`), BLOCKED = a block exists | 1 |
| follows | new `follows` | 1 |
| user_presence | new `user_presence` | 1 |
| user_privacy_settings | new `connect_settings` (CONNECT-specific; profile-field privacy stays in `privacy_settings`) | 1 |
| blocked_users | existing `blocks` | — |
| conversations, conversation_members, messages, message_attachments, message_reactions, message_receipts, message_requests | new tables | 2 |
| notifications, user_notification_settings | new tables | 2 |
| user_reports | new table | 2 |
| groups, group_members, group_invitations | existing `communities` / `community_memberships` extended + new `community_invitations` | 3 |
| calls, call_participants | new tables | 4 |
| voice_rooms, voice_room_participants, stories (= Moments), story_views, story_reactions | new tables | 5 |

## 3. Decisions taken for Phase 1 (reversible, documented)

- **C-1 Friends = FRIENDSHIP relationships.** A friend request creates a `FRIEND` relationship (PENDING); accepting confirms it through the same verification log. One system, already tested.
- **C-2 Who may send friend requests:** `EVERYONE` (default) · `FRIENDS_OF_FRIENDS` · `NOBODY`. Minors can receive requests only from their family (stewards decide).
- **C-3 Followers:** one-way, no approval; who may follow: `EVERYONE` (default) · `FRIENDS` · `NOBODY`. Minors cannot be followed. Follower lists are visible to the owner only; counts are visible to people who can see the profile.
- **C-4 Online status:** manual mode `ONLINE` / `BUSY` / `AWAY` / `INVISIBLE`; actual state from activity (heartbeat while the app is open, online = active in the last 2 minutes). Visible to `FRIENDS` (default) · `EVERYONE` · `NOBODY`; "last seen" can be hidden. `INVISIBLE` shows Offline to everyone. Phase 2 moves presence onto the WebSocket.
- **C-5 Friend list visibility:** `FRIENDS` (default) · `EVERYONE` · `ONLY_ME`.
- **C-6 Discover / suggestions use only what members chose to show:** people who are `searchable`, adults, not blocked; reasons = mutual friends and shared languages that both made public. Never religion, origin, name, photo or location.
- **C-7 Anti-spam:** at most 30 friend requests per 24 h and 100 open outgoing requests per member; after a rejection the same sender must wait 30 days.

## 4. Decisions needed from the owner before later phases

| # | Question | Options / cost |
|---|---|---|
| D-C1 | Real-time transport (Phase 2) | WebSocket gateway in the existing API (free; one Render instance; Redis needed only when scaling to several instances). **Recommended.** |
| D-C2 | TURN server for calls (Phase 4) | Public STUN is free; TURN relays media for ~10–20 % of users behind strict NATs: self-hosted coturn on a small VPS (~€5–10/month) or a paid service (pay per GB). |
| D-C3 | Storage for photos, videos, files, voice messages (Phase 2) | S3-compatible object storage (e.g. Cloudflare R2: 10 GB free, then ~€0.015/GB/month, no egress fees) vs PostgreSQL (free Render DB is 1 GB and expires after 30 days). |
| D-C4 | Push notifications (Phase 2) | Web Push (VAPID, free) for browsers + Android app; iOS later. |
| D-C5 | Translation provider (Phase 5) | DeepL / Google (paid per character; Kurmanji not supported by DeepL) or self-hosted LibreTranslate (free, weaker quality, needs a server). |
| D-C6 | Administrators | Who may hold the admin role; what they may see (never E2EE content; reports only). |
| D-C7 | End-to-end encryption | Not claimed. Proposal: transport encryption now; E2EE for 1:1 chats as a separate, tested milestone (key management on devices). |
| D-C8 | Mobile bottom navigation Home · Friends · Messenger · Discover · Profile | Replaces the current tab layout on phones; to be done with Phase 2 (when Messenger exists, so no button is a placeholder). |

## 5. Phases

| Phase | Content | Test before moving on |
|---|---|---|
| **1** | Friends, requests (send / accept / reject / cancel / remove), followers, mutual friends, discover & suggestions, online status, CONNECT privacy settings, block | API tests with two accounts (+ a third for mutual friends), web e2e with two browsers |
| 2 | WebSocket gateway, 1:1 + group conversations, text, replies, edit, delete, reactions, pins, search, receipts, typing, attachments (after D-C3), voice messages, notifications centre + settings + DND, message requests, reports | two accounts in two browsers, live delivery without reload |
| 3 | Groups on communities: create, public/private, invite, join requests, roles OWNER/ADMIN/MODERATOR/MEMBER, remove/leave, group chat, polls | roles and permissions enforced server-side |
| 4 | WebRTC 1:1 audio/video, group calls (mesh ≤ 4, SFU later), signalling over the gateway, STUN/TURN (D-C2), reconnect, call log, missed calls | two devices / networks |
| 5 | Voice rooms, translator (D-C5), smart connections (professions/skills from Professional Identity, groups), Moments (24 h, audiences, views) — no third video section | per feature |

## 6. Phase 1 — technical detail

**Database (migration `connect_phase1`):** `follows (follower_profile_id, followee_profile_id, created_at, PK both, CHECK not self)` · `connect_settings (profile_id PK, friend_requests_from, follows_from, presence_visible_to, show_last_seen, friend_list_visible_to, status_mode, updated_at)` · `user_presence (profile_id PK, last_active_at)`.

**API (`/api/connect/…`, all behind `JwtGuard`):**
`GET people/:id` (friendship state, follow state, mutual friends, presence, allowed actions) · `POST friends/requests` · `GET friends/requests?direction=incoming|outgoing` · `POST friends/requests/:id/accept|reject` · `DELETE friends/requests/:id` (cancel) · `GET friends` / `GET people/:id/friends` · `DELETE friends/:profileId` · `POST|DELETE follows/:profileId` · `GET followers` / `GET following` · `GET discover?q=` · `GET|PATCH settings` · `POST presence` (heartbeat).

**Web:** new "Friends" tab in the platform (friends · requests · discover · followers · settings), person card with Add friend / Accept / Cancel / Follow / Block, online dot.
