# SAMIR WANDERUNG — Test Report (2026-11-28)

Environment: Linux container, Node 22.23, Chromium (Playwright) with **software WebGL (SwiftShader), no GPU**,
network through an egress proxy. Every result below was produced by actually running the tests. Nothing is
estimated.

## 1. Static checks & build
| Check | Command | Result |
|---|---|---|
| TypeScript (strict, no unused) | `npm run typecheck` | **PASS** (0 errors) |
| Production build + PWA service worker | `npm run build` | **PASS** (precache 33 entries; Cesium copied as static assets and lazy-loaded) |

## 2. Unit & integration tests (vitest) — `npm test`
**51 tests, 51 passed** in the final runs. Breakdown:

| Suite | Tests | Covers |
|---|---|---|
| `tests/unit.test.ts` | 25 | haversine, polyline6 encode/decode (incl. Google reference vector), interpolation along the polyline (not a straight line), slicing, distance-to-line, coordinate parsing, resampling; DIN 33466 time; elevation stats with hysteresis and unknowns; difficulty; Valhalla costing mapping; round trip; timeline determinism, monotonicity, scene order, constant speed, inverse; playback (play, pause, seek, speed, end, restart) on a fake clock; GPX round trip and invalid input; GPS engine (jitter/accuracy filter, pause/resume, unavailable); slippy tile math (cross-checked with an independent Python computation); region size; emergency numbers; packing rules; i18n coverage and fallback; video project scenes |
| `tests/server.test.ts` | 19 | **Server-side permission enforcement** on an in-memory SQLite: registration validation, age gate (13+), hidden email, private minors, follow/unfollow, post visibility (public/followers/private) per viewer, comments, reactions, bookmarks, comment removal by post author, GPS route consent and endpoint trimming, blocking, reporting, admin-only reports, events (join request, accept, capacity, participants-only list, adults-only, minors cannot organise, leave, cancel), live location (consent required, participants only, organizer-only view, revocation, no positions on the community map), private groups (invite required, roles, removal), notifications and preferences, media magic-byte check, rate limiting, auth required |
| `tests/providers.test.ts` | 7 | **Live providers:** Nominatim (Zugspitze coordinates), Valhalla route Eibsee → Zugspitze (length vs summary, longer than the straight line), Valhalla `/height` (min < 1100 m, max > 2700 m), surfaces, multi-leg round trip, input validation, an unroutable request returns `no_route`, Wikidata lakes in Germany (incl. Bodensee), all 75 country Q-IDs match their Wikidata labels |

Flakiness observed: the two Wikidata tests failed once (WDQS 502/timeout) and passed on re-run. The public
query service is shared and rate-limited.

## 3. End-to-end tests (real Chromium + real providers) — `npm run e2e`
All stages passed in their final runs (`tests/e2e/e2e.mjs`). Screenshots are in `docs/screenshots/`.

| Stage | Tests | Result | Key evidence |
|---|---|---|---|
| core | 17 | 17/17 | brand and tagline; map initialises with real tiles; navigation to all 13 other modules; language switch EN→AR (`dir=rtl`)→DE→KU→EN; no runtime errors |
| planner | 4 | 4/4 | **Real route Eibsee → Zugspitze: 15.84 km, ascent 2294 m** (mountain type); intermediate stop Knorrhütte recalculates (30.72 km, 3 markers); elevation profile; save journey; mid-Atlantic points → "No hiking route found" and no route details |
| cinematic | 4 | 4/4 | "CINEMATIC SIMULATION" label; hiker advances; **hiker position 0.08–0.26 m from the route polyline**; pause holds position; speeds 0.5×/2×/4×/1×; Follow/Aerial/Free; scrub to 50 % time → 48 % distance; arrival scene; restart → 0 %; hiker marker and loops removed on leaving the page |
| world | 1 | 1/1 | Cesium globe canvas; search "Matterhorn" → flight → MapLibre DEM terrain; return to globe closes the terrain view |
| atlas | 1 | 1/1 (failed once on a 90 s timeout before the seed cache existed) | 30 real Wikidata destinations; detail page with Wikidata source link |
| live | 1 | 1/1 | Tracking, **off-route warning**, GPX export. ⚠ Positions were **emulated by the test browser** (Playwright `setGeolocation`); this is not a real-device GPS test |
| community | 1 | 1/1 | register, log in, publish a post, create an event via geocoded meeting point |
| studio | 1 | 1/1 | **Real MP4 exported and validated with ffprobe + full ffmpeg decode:** H.264 High, 1920×1080, 30 fps, 465 frames, 15.52 s, Opus 48 kHz stereo, 12.06 MB, ISO-MP4. Sample: `docs/samples/journey-eibsee-zugspitze-1080p.mp4`, frames in `16-video-frames.png` |
| offline | 1 | 1/1 | Downloaded a region (163 tiles, 9.7 MB, z8–14), set the browser **offline**, reloaded: **80 tile requests served from cache, 0 failed** |
| mobile | 1 | 1/1 | 390×844: no horizontal overflow on 9 pages; map height ≥ 200 px on planner/live/atlas (a regression this check found and that is now fixed) |

Bugs found by these tests and fixed: map container collapsing to 0 height (absolute + relative classes);
map collapsing on mobile (`flex-1` in column layouts); Play clickable before the map was ready; the server
returning `index.html` for missing assets; the atlas query paginating rows instead of items and timing out;
`node:sqlite` stripped by the bundler; geocoder ranking infrastructure above natural features.

## 4. Performance measurements (software WebGL; no GPU available)
| Measurement | Value |
|---|---|
| Cinematic 3D (satellite + DEM terrain) frame rate | **≈ 1 fps** in SwiftShader. Not representative of GPU devices, which were **not tested** |
| Video export, 1080p30, 15.5 s | about 20 min wall time in software WebGL (each map frame waits for tiles) |
| JS heap after leaving the cinematic page | 45–212 MB across runs (tile caches; no growth trend established) |
| Wikidata atlas live query | 1–60 s (seeded first pages: instant) |
| Geocoding (Nominatim via server) | 0.8–1.4 s |

## 5. Not tested (requires physical devices or credentials)
| Area | Status |
|---|---|
| Real outdoor GPS on Android/iOS phones | **NOT TESTED** |
| Windows desktop with a GPU; Android Chrome performance, battery, memory | **NOT TESTED** |
| Installed PWA on Android/Windows | **NOT TESTED** (manifest and service worker build correctly) |
| Background GPS | **Not supported** by web apps (documented) |
| AI assistant end-to-end | **NOT TESTED**: no `ANTHROPIC_API_KEY` in the test environment. The "not configured" path was verified |
| Weather panel with data | **PARTIAL**: Open-Meteo returned 429 from the shared test IP for most calls; the error/retry state was verified |
| Overpass trails & peaks in the browser | **PARTIAL**: Overpass connections were dropped by the test network |
| 60 fps export, vertical/square export | Encoder support is detected at runtime; **only 1080p30 landscape was rendered and validated** |
| 4K export | Not offered and not claimed |
| Screen readers | Not tested (landmarks, labels and ARIA states are implemented) |

## 6. Real-device acceptance checklist (to do)
1. Android Chrome: install PWA, plan a route, Live Navigation outdoors for 30 min (accuracy, track, off-route, wake lock, battery %), airplane mode with a downloaded region, GPX export.
2. Windows Chrome/Edge with GPU: cinematic fps at 1×/4×, a 60-second video export at 1080p30 and 60 fps, vertical export.
3. iPhone Safari: map, planner, RTL; note that WebCodecs export is unavailable.
4. With `ANTHROPIC_API_KEY`: AI trip planning in all four languages; refusal and error handling.
