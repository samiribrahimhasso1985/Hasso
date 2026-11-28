# SSBN
**3D Hiking & Journey Animation — EXPLORE THE WORLD. EXPERIENCE THE JOURNEY.**

An independent hiking and cinematic navigation web app (installable PWA): real 3D terrain, a CesiumJS digital
globe, real OpenStreetMap hiking routes (Valhalla), cinematic route simulation, live GPS recording, a video studio
that exports real MP4s, offline maps, a mountain safety center, a Wikidata-based world nature atlas, an AI hiking
assistant (server-side) and a social hiking community. UI in English, Deutsch, العربية (RTL) and Kurdî.

```bash
npm install
npm run server   # API on :8787
npm run dev      # app on http://localhost:5173
```
Production: `npm run build && npm start` → http://localhost:8787 (see docs/INSTALLATION_GUIDE.md).

## Structure
```
samir-wanderung/
├── index.html, vite.config.ts (React + Vite + Tailwind + PWA + Cesium assets)
├── server/                 Node server (no framework)
│   ├── index.mjs           HTTP server, static hosting, security headers, routing
│   ├── providers.mjs       Nominatim, Valhalla (route/height/trace_attributes), Open-Meteo, Overpass, Wikidata
│   ├── ai.mjs              AI assistant (Anthropic SDK, structured output; key stays on server)
│   ├── social.mjs          Community API: auth, profiles, feed, groups, events, live sharing, moderation (SQLite)
│   └── data/atlas-seed.json  Real Wikidata results cached for fast first load
├── src/
│   ├── config/providers.ts Provider registry: attribution, licences, offline policy
│   ├── core/               i18n (en/de/ar/ku, RTL), app store + hash router, API client
│   ├── engines/
│   │   ├── map/            MapEngine (MapLibre: DEM terrain, hillshade, contours, satellite, route layers)
│   │   ├── globe/          GlobeEngine (CesiumJS globe, picking, cinematic flights)
│   │   ├── route/          geo math, polyline, Valhalla client, elevation stats, DIN 33466 time, difficulty
│   │   ├── gps/            GPSEngine (Geolocation API), GPX import/export
│   │   ├── animation/      JourneyTimeline, PlaybackController, RouteAnimation/HikerMovement/
│   │   │                   CinematicCamera/ArrivalScene controllers, CinematicJourney orchestrator
│   │   ├── video/          Project model, SceneRenderer, WebCodecs + mp4-muxer exporter, audio mixer
│   │   ├── offline/        Region tile downloader (Cache API), integrity, deletion
│   │   ├── storage/        IndexedDB (journeys, tracks, photos, regions, projects, settings)
│   │   ├── weather/ safety/ ai/ atlas/
│   ├── features/           Pages: Home, WorldExplorer, Planner, Cinematic, LiveNavigation, MountainExplorer,
│   │                       Journeys, Atlas, Assistant, Community, Studio, Safety, Offline, Settings
│   └── ui/                 MapView, shared components, WeatherPanel, device health hook
├── tests/                  vitest unit/server/provider tests, e2e/e2e.mjs (Playwright, real providers)
└── docs/                   Audit, test report, guides, release notes, data-source & coverage reports, screenshots
```

## Documentation
- [Final project audit](docs/FINAL_PROJECT_AUDIT.md) · [Test report](docs/TEST_REPORT.md) · [Release notes](docs/RELEASE_NOTES.md)
- [Installation](docs/INSTALLATION_GUIDE.md) · [Deployment](docs/DEPLOYMENT_GUIDE.md) · [Privacy & location](docs/PRIVACY_AND_LOCATION_GUIDE.md)
- [Geographic data sources](docs/GEOGRAPHIC_DATA_SOURCES.md) · [Data coverage](docs/DATA_COVERAGE_REPORT.md) · [Global explorer report](docs/GLOBAL_EXPLORER_REPORT.md) · [Global search tests](docs/GLOBAL_SEARCH_TESTS.md) · [Phase 11 release report](docs/PHASE_11_RELEASE_REPORT.md)

## Important
Cinematic Journey is a **simulation** of a planned route, not GPS navigation. Route data comes from OpenStreetMap and
may be outdated; SSBN never claims a trail is open or safe and is not a rescue service.
