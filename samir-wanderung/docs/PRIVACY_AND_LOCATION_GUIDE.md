# SSBN — Privacy & Location Guide

## Principles
1. **Local first.** Journeys, recorded GPS tracks, photos, notes, offline maps, the safety checklist and emergency
   contact are stored only in your browser (IndexedDB / Cache Storage) on this device.
2. **Location only with permission.** The device position is read only after you grant the browser's location
   permission, and only while a feature that needs it is active (Live Navigation, "use my location", Safety Center,
   opt-in event sharing).
3. **No silent transmission.** Your live position is never sent to the SSBN server, except when you
   explicitly turn on live sharing inside a community event (see below).
4. **You can delete everything.** Settings → "Delete all local data" removes all local records. Community accounts can be
   deleted from Community → Profile → "Delete account" (removes profile, posts, comments, events and media references).

## What leaves the device, and why
| Data | Sent to | When |
|---|---|---|
| Search text | our server → Nominatim (OSM) | when you search a place |
| Start/stop/destination coordinates | our server → Valhalla | when you calculate a route |
| A coordinate (start point / your location for weather) | our server → Open-Meteo | weather panels |
| A coordinate for reverse geocoding | our server → Nominatim | picking a point on the map, Safety Center country lookup |
| Chat messages | our server → Anthropic API | only in the AI assistant, only if configured |
| Posts, photos, published routes | our server (community DB) | only when you publish |
| Live position | our server, visible only to the event organizer | only after explicit opt-in per event |

The server does not log request bodies or coordinates (errors are logged without payloads).

## Community privacy controls
- Every post has visibility **Public / Followers / Private**; enforced on the server.
- Publishing a GPS route requires an explicit consent checkbox; **"Hide exact start and end"** is on by default and trims
  ~300 m from both ends on the server before storage.
- Email addresses are never shown to other users.
- Users under 18 (self-declared birth year) get a private profile by default, cannot join adults-only events and
  cannot organise events. Age is not verified.
- Block/mute/report are available on posts, users and events.

## Live location sharing (group journeys)
- **Off by default.** Requires an explicit confirmation each time it is switched on.
- Only for accepted participants of an event; **only the organizer** can see shared positions; other participants and
  the public community map never receive coordinates.
- Stops immediately when switched off, when you leave the event, when the event is cancelled, and **automatically when
  the event ends** (server-side expiry). Expired positions are deleted.

## GPS recording
- Recording runs while the Live Navigation page is open; points are saved locally every few seconds so a crash loses at
  most a few seconds. A web app cannot record with the screen off/in the background.
- Battery-saver mode lowers accuracy and records fewer points.
- GPX export creates a file on your device; nothing is uploaded.

## Emergency features
- The emergency screen shows your last known coordinates, accuracy and time; it can open your SMS app with a prepared
  message or the share sheet. **Nothing is ever sent automatically**, and SSBN cannot confirm delivery.
- SSBN is not a rescue service and has no satellite communication.

## Security notes
- Passwords are hashed with scrypt (random salt); sessions are random 256-bit tokens stored hashed; cookies are
  `HttpOnly; SameSite=Lax` (+ `Secure` in production). Mutating API calls require `application/json` (CSRF hardening).
- Uploaded media are type-checked by magic bytes and served only to users allowed to see the referencing post.
- Local data in the browser is protected by the browser's same-origin storage; it is not additionally encrypted.
  Use a device lock screen.
