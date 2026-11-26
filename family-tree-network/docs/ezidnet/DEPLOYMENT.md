# EZIDNET — Deployment (v1.1)

> **Nothing is purchased or deployed without the owner's explicit approval** (spec §18). The domain EZIDNET.COM is not
> purchased yet.

## 1. Environments
| Environment | Purpose | Hosting (proposal) |
|---|---|---|
| Local (Windows PC) | development | Node 22 + Supabase CLI with Docker Desktop, **or** a free Supabase cloud dev project |
| Staging | owner review, testers | Supabase project (EU) + Vercel preview (EU region) |
| Production | public | Supabase Pro (EU) + Vercel (EU) or equivalent; custom domain after purchase approval |

## 2. Windows setup (planned instructions)
1. Install Node.js 22 LTS, Git for Windows, VS Code.
2. Optional: Docker Desktop + Supabase CLI (`npx supabase start`) for a fully local stack.
3. `git clone`, `npm install`, copy `.env.example` → `.env.local` (keys never committed).
4. `npm test`, `npm run dev`.
All scripts are cross-platform (no bash-only commands); verified on Windows before Phase 2 sign-off.

## 3. Secrets
Stored in the hosting provider's secret manager and local `.env` files that are git-ignored. The Supabase
`service_role` key is used only on the server, never in the browser or the Kids area.

## 4. Release process
CI (tests) green → staging deploy → owner review → production deploy (manual approval) → smoke tests → release note.
Database migrations run before the app release, are reversible where possible, and are tested on staging first.

## 5. Backups & recovery
Supabase daily backups (Pro plan) + point-in-time recovery if budget allows; monthly restore test on staging;
documented incident and breach-response procedure (72-hour notification duty under GDPR).

## 6. PWA
Web app manifest, icons, service worker caching static assets only (never private API responses), offline page.
Kids content may later be cached for offline use only after a guardian enables it.

## 7. Monitoring
Error tracking without personal data in logs, uptime check, auth anomaly alerts (e.g. mass profile viewing).
