# SAMIR WANDERUNG — Installation Guide

## Requirements
- Node.js **22.12 or newer** (uses the built-in `node:sqlite` module and `--env-file-if-exists`)
- npm 10+
- A modern browser with WebGL (Chrome/Edge/Chromium recommended; WebCodecs MP4 export needs Chromium)
- Internet access to: tiles.openfreemap.org, s3.amazonaws.com (terrain), server.arcgisonline.com (satellite),
  valhalla1.openstreetmap.de, nominatim.openstreetmap.org, api.open-meteo.com, overpass-api.de, query.wikidata.org

## Install & run (development)
```bash
git clone https://github.com/samiribrahimhasso1985/Hasso.git
cd Hasso/samir-wanderung
npm install
cp .env.example .env        # optional: add ANTHROPIC_API_KEY, VITE_CESIUM_ION_TOKEN
npm run server              # API server on http://localhost:8787
npm run dev                 # app on http://localhost:5173 (proxies /api to :8787)
```
Open http://localhost:5173.

> Behind an HTTP proxy (corporate networks, some CI/cloud sandboxes), Node's `fetch` ignores `HTTPS_PROXY`
> unless started with `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21): `NODE_USE_ENV_PROXY=1 npm run server`.

## Production build (single process)
```bash
npm run build               # type-check + Vite build → dist/ (includes PWA service worker)
npm start                   # serves dist/ and the API on http://localhost:8787
```
`NODE_ENV=production` marks the session cookie `Secure`, so serve it over HTTPS (see DEPLOYMENT_GUIDE.md).
For a local production test over plain HTTP run `node server/index.mjs` without `NODE_ENV=production`.

## Tests
```bash
npm run typecheck
npm test                    # unit + server permission tests + live provider tests (network)
npm run test:offline-safe   # skips the live provider tests
npm run build && node server/index.mjs &   # then:
npm run e2e                 # Chromium end-to-end suite (stages: core planner cinematic world atlas live community studio offline mobile)
```

## Install as an app (PWA)
- **Desktop (Chrome/Edge, Windows/macOS/Linux):** open the HTTPS site → install icon in the address bar → "Install".
- **Android (Chrome):** menu ⋮ → "Install app" / "Add to Home screen".
- **iOS (Safari):** Share → "Add to Home Screen" (WebCodecs MP4 export and background GPS are not available on iOS).

A native Android APK or Windows installer is **not** built — see RELEASE_NOTES.md "Native packaging" for the steps.

## Optional configuration
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables the AI hiking assistant (server-side only). Without it the assistant page says it is not configured. |
| `VITE_CESIUM_ION_TOKEN` | Cesium World Terrain on the globe. Without it the globe uses a smooth ellipsoid; detailed terrain appears after the hand-off to MapLibre. |
| `VALHALLA_URL`, `NOMINATIM_URL`, `OVERPASS_URLS`, `OPEN_METEO_URL` | Point to self-hosted or commercial providers. |
| `UPSTREAM_USER_AGENT` | Identify your deployment to OSM-based services (required by their policies). |

Refresh the Nature Atlas seed (real Wikidata data, cached 30 days): `npm run prefetch:atlas -- en de ar`.
