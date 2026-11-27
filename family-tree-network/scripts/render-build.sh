#!/usr/bin/env bash
# Build for the online test server (Render). Website + platform in one service; the API is only reachable
# through the web server's /api proxy.
set -euo pipefail
npm ci --include=dev
npm run build:engine
npm run build -w @ftn/api
NEXT_PUBLIC_API_URL=/api \
NEXT_PUBLIC_SHOW_DEMO=false \
API_PROXY_TARGET=http://127.0.0.1:4000/api \
NEXT_TELEMETRY_DISABLED=1 \
  npm run build -w @ftn/web
