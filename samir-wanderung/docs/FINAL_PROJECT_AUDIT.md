# SSBN — Final Project Audit (2026-11-28)

## Scope & history
The repository contained no previous SSBN code: earlier phase work had been lost when its session
restarted without committing. The project was therefore built in one pass covering Phases 1–11 in
`samir-wanderung/`, committed incrementally to branch `ccr-ea8dcbdb-gmxjqk`. (Phase 5, live GPS, was not
specified separately, so it was implemented from the requirements repeated in Phases 6 and 10.)

## Architecture review
- Frontend: React 18 + TypeScript (strict) + Vite + Tailwind; MapLibre GL 4 (terrain, contours); CesiumJS
  (lazy-loaded, about 4 MB); Three.js is installed but **not used**. MapLibre's own 3D terrain and the Cesium
  globe cover the 3D needs, so it is a candidate for removal.
- Engines are separated from the UI (`src/engines/*`). The animation logic has no React dependency, and React
  receives throttled 10 Hz snapshots.
- Server: a single Node process with no framework. It proxies providers (keys and policies stay server-side),
  runs the AI endpoint and the community API on SQLite, and serves the PWA.

## Findings
| # | Type | Finding | Status |
|---|---|---|---|
| 1 | Broken UI | Map containers collapsed to 0 height (class conflict; `flex-1` on mobile) | Fixed, guarded by E2E |
| 2 | Race | Play/Restart usable before the cinematic engine was ready | Fixed |
| 3 | Deploy | Missing `/assets/*` returned `index.html` (stale-client MIME errors) | Fixed (404) |
| 4 | Data | Atlas SPARQL LIMIT counted rows instead of items; worldwide queries timed out | Fixed (GROUP BY; seed cache) |
| 5 | Search quality | Infrastructure ranked above nature ("Gullfoss" → reserve, "Titicaca" → boundary) | Improved ranking; residual misses documented |
| 6 | Build | Cesium's dependency `@zip.js/zip.js` resolved to an incompatible version | Pinned via npm `overrides` |
| 7 | Unused | `three` dependency not used | Open (remove or use in a later phase) |
| 8 | Duplicate | Elevation profile components / map views are shared; no duplicate modules found | — |
| 9 | Performance | Cinematic ≈1 fps in software WebGL; GPU devices untested | Open: needs device testing |
| 10 | Security | No secrets in the bundle (grep of `dist/` for `sk-ant-` and key assignments: no key values; only the variable name inside the translated "not configured" message); the AI key is server-only; scrypt hashing; hashed session tokens; HttpOnly/SameSite cookies; JSON-only mutations; per-IP and per-user rate limits; media magic-byte checks; access-checked media; security headers | OK |
| 11 | Security | No CSP header set by the app (documented for the reverse proxy); no email verification or password reset; no 2FA | Open |
| 12 | Privacy | Server logs no bodies or coordinates; live sharing is opt-in and expires; route endpoints trimmed by default; delete-all-local-data and delete-account available | OK |
| 13 | Data integrity | Orphaned media files remain on disk after account deletion (DB rows are deleted) | Open |
| 14 | i18n | Kurdish translation partial (falls back to English); not reviewed by native speakers (ar/ku/de) | Open |
| 15 | Video | World-zoom scene is 2D Web Mercator, not the Cesium globe; the satellite style is not used in video exports (licensing) | Documented |

## Module classification (release decision)
| Module | Classification | Reason |
|---|---|---|
| Phase 1 foundation (shell, nav, design system, i18n, PWA) | **PASS** | E2E core 17/17; RTL verified |
| Map engine (terrain, hillshade, contours, satellite) | **PASS** | real tiles verified; DEM elevations at Zugspitze |
| Globe engine (Cesium) & globe→terrain transition | **PARTIAL** | works in automated tests; no Cesium ion terrain (no token); untested on GPU/mobile touch hardware |
| Route engine (Valhalla) & planner | **PASS** | real routes, stops, round trip, no-route handling; alternatives depend on Valhalla |
| Cinematic animation engine | **PASS** (functional) / **PARTIAL** (performance) | all behaviours tested; smoothness unverified on real GPUs |
| Live GPS navigation | **PARTIAL** | code paths tested with emulated positions; **no real-device outdoor test** |
| Offline maps | **PASS** (browser) / **PARTIAL** (devices) | network-off test served 80 tiles from cache |
| GPX import/export | **PASS** | unit round trip + E2E export |
| Mountain Safety Center | **PARTIAL** | checklist and emergency info work; no closure/avalanche/warning feeds |
| Weather | **PARTIAL** | integration works; provider often rate-limited from the test IP |
| Mountain Explorer (OSM peaks) | **PARTIAL** | Overpass unreliable from the test network |
| Nature Atlas / Global Explorer | **PASS** with documented coverage gaps | real Wikidata data; trails and seasons partial |
| AI assistant | **PARTIAL** | implemented; **not tested end-to-end** (no API key) |
| Community / social | **PASS** (server rules) / **PARTIAL** (UI breadth) | 19 permission tests; UI smoke-tested; no email verification or moderation dashboard UI |
| Journey Video Studio | **PASS** for 1080p30 landscape / **PARTIAL** otherwise | real MP4 validated; vertical/square/60 fps not rendered in tests |
| Native Android APK / Windows installer | **NOT IMPLEMENTED** | steps in RELEASE_NOTES.md |
| Background GPS | **NOT IMPLEMENTED** | not possible in a web app |
| Trail closures / official warnings / avalanche data | **NOT IMPLEMENTED** | no verified feed connected; the UI says so |

## Release decision
**Not production-ready.** It is suitable as a **public beta PWA** after deployment on HTTPS with self-hosted or
commercial routing/geocoding. Blocking items before production:
1. Real-device GPS, offline and performance acceptance tests (TEST_REPORT §6).
2. A production routing/geocoding provider (the public demo servers have fair-use limits).
3. Account security: email verification, password reset, CSP.
4. A moderation UI for reports.
5. Native-speaker review of Arabic, German and Kurdish.

## Commands
```bash
cd samir-wanderung
npm install
npm run typecheck && npm test        # static + unit/server/provider tests
npm run build                        # production build (dist/)
npm run server                       # dev API (:8787)   + npm run dev (:5173)
npm start                            # production (serves dist + API on :8787, HTTPS proxy in front)
node server/index.mjs & npm run e2e  # end-to-end (local HTTP)
```
