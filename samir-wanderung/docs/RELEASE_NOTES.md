# SAMIR WANDERUNG 0.1.0 — Release Notes (2026-11-28)

**Status: release candidate for a web/PWA beta. Not production-ready.** See FINAL_PROJECT_AUDIT.md §Release decision.

## Highlights
- **3D world:** MapLibre GL with real DEM terrain (AWS Terrain Tiles), hillshade, DEM-derived contour lines,
  Esri satellite imagery, and a CesiumJS digital globe with an eased flight and crossfade into detailed terrain.
- **Real hiking routes:** Valhalla pedestrian routing on OSM, with intermediate stops, round trips, Valhalla
  alternatives, and four route types the engine actually supports (standard, shortest, easier, mountain). Includes
  DEM elevation profile, ascent/descent, min/max elevation, DIN 33466 hiking time (estimate), estimated difficulty
  from OSM `sac_scale` and effort, surface breakdown, and turn-by-turn instructions.
- **Cinematic simulation:** a deterministic timeline (opening, route reveal flyover, hike with waypoint holds,
  arrival). The hiker is interpolated along the real route geometry. Follow, Aerial and Free cameras. Play, pause,
  restart, scrubbing, and 0.5×/1×/2×/4× speeds. Clearly labelled **CINEMATIC SIMULATION**.
- **Live GPS:** real Geolocation API tracking with jitter/accuracy filtering, pause/resume, crash-safe local
  persistence, off-route detection (3 consecutive fixes over max(50 m, accuracy)), online rerouting, GPX
  import/export, Screen Wake Lock, and battery-saver mode.
- **Journey Video Studio:** an editable scene timeline (title, world zoom, route reveal, follow/aerial route
  segments, photos, user clips, end screen), branding, synthesized ambience and footsteps, and user music with
  fades. Real WebCodecs encoding to MP4 (H.264, VP9 fallback) via mp4-muxer, with progress and cancellation.
- **Offline & safety:** a region tile downloader limited to providers whose policy allows caching, with progress,
  cancel/resume, integrity check, storage display and deletion. The service worker serves cached tiles offline.
  The Mountain Safety Center has a customisable checklist, emergency information (last position, accuracy,
  altitude, battery, verified emergency numbers), and a prepared SMS or share sheet (never sent automatically).
- **Discovery:** the Wikidata Nature Atlas (10 categories, continent/country filters, clustering, detail pages with
  sources), OSM trail relations near destinations, OSM peaks in view, weather (Open-Meteo), and seasonal guidance.
- **AI assistant:** a server-side Claude integration that returns structured trip plans. Every plan is geocoded and
  verified by Valhalla before it is shown, then gets a weather-aware packing list and requires user confirmation.
- **Community:** accounts, profiles, follow, a feed with visibility levels, comments, reactions, bookmarks, groups
  with roles, events with join requests, capacity and updates, consent-based live sharing visible only to the
  organizer, notifications with preferences, block, mute, report, rate limits, and protections for minors.
- **Languages:** English, Deutsch, العربية (full RTL), Kurdî (Kurmancî, partial; falls back to English).

## Known limitations
See FINAL_PROJECT_AUDIT.md §Known limitations. The main ones:
- No real-device GPS, Android, Windows or installed-PWA acceptance tests have been performed yet.
- Performance was measured only in software WebGL (no GPU in the test environment, about 1 fps in 3D).
- The AI assistant was not tested end-to-end because no API key was configured in the test environment.
- No closures, avalanche or official-warning feeds are integrated.
- The video studio's world-zoom intro is a 2D Web-Mercator zoom, not the Cesium globe.

## Native packaging (not built)
No Android APK and no Windows installer exist. Remaining steps:
1. **Android:** wrap the PWA as a Trusted Web Activity (Bubblewrap: `bubblewrap init --manifest https://<domain>/manifest.webmanifest`,
   `bubblewrap build`), add Digital Asset Links on the domain, sign with a release keystore, then test on devices.
   Background GPS would need a native foreground service (Capacitor or Kotlin), which a TWA cannot provide.
2. **Windows:** install the PWA from Edge, or package it with PWABuilder (MSIX) and sign it with a code-signing
   certificate.
3. Re-run the acceptance checklist in TEST_REPORT.md on the packaged builds.
