# SSBN — Deployment Guide

SSBN is one Node.js process (`server/index.mjs`) that serves the built PWA (`dist/`) and the API
(`/api/*`: provider proxies, AI assistant, community). State lives in SQLite + a media folder (`DATA_DIR`).

## 1. Build
```bash
npm ci
npm run build
```

## 2. Run
```bash
NODE_ENV=production PORT=8787 DATA_DIR=/var/lib/samir-wanderung \
UPSTREAM_USER_AGENT="SSBN/0.1 (+https://your-domain; you@your-domain)" \
ANTHROPIC_API_KEY=... node server/index.mjs
```
Use a process manager (systemd, pm2, Docker). Example systemd unit:
```ini
[Service]
WorkingDirectory=/opt/samir-wanderung
EnvironmentFile=/opt/samir-wanderung/.env
ExecStart=/usr/bin/node server/index.mjs
Restart=always
User=samir
```

## 3. HTTPS reverse proxy (required)
Geolocation, service workers, PWA install and `Secure` cookies require HTTPS. Example Caddy:
```
your-domain.example {
  reverse_proxy 127.0.0.1:8787
}
```
Set `TRUST_PROXY=1` so rate limiting uses the real client IP from `X-Forwarded-For`.
Recommended response header at the proxy: `Content-Security-Policy` allowing the map/tile hosts listed in
INSTALLATION_GUIDE.md, `blob:` workers, and `'wasm-unsafe-eval'` for Cesium.

## 4. Persistence & backups
Back up `DATA_DIR` (`social.db*`, `media/`). SQLite runs in WAL mode; use `sqlite3 social.db ".backup out.db"`
for consistent online backups.

## 5. Providers for production traffic
The defaults are free community services with strict fair-use policies (Nominatim: max 1 req/s, no heavy use;
FOSSGIS Valhalla: demo server; Overpass: shared). For a public launch:
- self-host **Valhalla** (planet or regional OSM extract with elevation) and set `VALHALLA_URL`
- self-host **Nominatim** or use a commercial geocoder and set `NOMINATIM_URL`
- keep `UPSTREAM_USER_AGENT` with a real contact
The server already caches geocoding (24 h), weather (15 min), trails (6 h) and the atlas (6 h + 30-day seed),
serialises Nominatim calls to ≤ 1/s and rate-limits clients per IP.

## 6. Secrets
- `ANTHROPIC_API_KEY` is only read by the server; it is never sent to the browser or bundled.
- `VITE_*` variables **are public** (embedded in the JS bundle). Only put public, domain-restricted tokens there.
- `.env` is git-ignored.

## 7. Static-only hosting?
Not supported: routing, geocoding, AI and community features need the server (keys + policies). The map, offline
GPS recording, GPX and cinematic replay of saved journeys continue to work client-side if the API is unreachable.
