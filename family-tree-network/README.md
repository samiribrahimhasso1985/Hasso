# FAMILY NETWORK

A multidimensional relationship network: **one person, one identity, every relationship** — family, marriage,
friends, colleagues and acquaintances in one verified graph. Design: Modern Luxury / Editorial Minimalism
(`docs/design/`). Languages: Arabic (RTL), German, English.

> This is **not** a genealogy tree app. The family tree is one view of the relationship graph.

## What works today (Phase 2 prototype)

* Relationship engine: 20+ relationship types in 6 categories, canonical storage, structural validation, two-sided
  verification, derived kinship (grandparents, uncles/aunts, cousins, in-laws, step/half relations, Arabic عم/خال terms).
* REST API (NestJS + PostgreSQL): auth, profiles with field privacy, managed profiles for children/ancestors,
  relationship lifecycle, visibility-filtered graph, “How Are We Connected?”, blocking, audit log.
* Web app (Next.js + Cytoscape.js): interactive relationship graph, network & generations layouts, filters, search,
  expand/collapse, path highlighting, verification inbox, add-relationship dialog, ar/de/en with full RTL.

Documentation: [`docs/`](docs) — **master implementation plan** (`docs/FAMILY_NETWORK_MASTER_IMPLEMENTATION_PLAN.md`), progress report, architecture, database schema, relationship engine, UI/UX, security & privacy, roadmap.
Specification: [`CLAUDE.md`](CLAUDE.md).

## Run locally

Requirements: Node.js ≥ 20 (22 recommended), PostgreSQL 16 (or Docker).

```bash
cd family-tree-network
docker compose up -d                 # PostgreSQL with databases ftn and ftn_test (or use your own)
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run build:engine
npm run db:migrate                   # apply migrations
npm run db:seed                      # relationship types + FICTIONAL demo network (development only)
npm run dev:api                      # http://localhost:4000/api
npm run dev:web                      # http://localhost:3000
```

Demo accounts (development only, shown as shortcuts on the login screen):
`omar@demo.ftn.local`, `anna@…`, `khaled@…`, `sara@…`, `karim@…`, `peter@…`, `julia@…`, `daniel@…` —
password `demo-password-2026`.

## Desktop app (Windows/Linux)

`desktop/` packages the whole platform (database, API, web app) into one desktop app — see
[`desktop/README.md`](desktop/README.md).

## Android development app

`apps/android` contains a small WebView app that opens the web app from your own test server (e.g. your PC on the same
Wi-Fi). See [`apps/android/README.md`](apps/android/README.md). Development build only — not for real users.

## Tests

```bash
npm test                             # engine (54) + API integration on ftn_test (34) + web unit (12)
npm run e2e -w @ftn/web              # 6 real-browser tests; needs API + web running; reseeds the dev DB
```

For repeated e2e runs start the API with `AUTH_RATE_LIMIT_PER_MINUTE=100` (the default login limit is 10/minute).

## Structure

```
packages/relationship-engine   pure TypeScript domain core
apps/api                       NestJS + Prisma + PostgreSQL
apps/web                       Next.js + Cytoscape.js
docs/                          architecture & decisions
```
