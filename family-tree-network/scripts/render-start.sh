#!/usr/bin/env bash
# Start on the online test server: database migrations, relationship-type catalogue (no demo people),
# API on 127.0.0.1:4000 (not exposed), web server on $PORT (website at /, platform at /app, /api proxied).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export APP_URL="${APP_URL:-${RENDER_EXTERNAL_URL:-http://localhost:${PORT:-10000}}}"

cd "$ROOT/apps/api"
npx prisma migrate deploy
SEED_DEMO=false npx ts-node --transpile-only prisma/seed.ts

HOST=127.0.0.1 PORT=4000 node dist/main.js &
API_PID=$!

cd "$ROOT/apps/web"
npx next start -p "${PORT:-10000}" -H 0.0.0.0 &
WEB_PID=$!

# If either process stops, stop the other and exit so the platform restarts the service.
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT TERM INT
wait -n $API_PID $WEB_PID
exit 1
