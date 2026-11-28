# EZIDINET — website (part of the web app)

The public website and the platform are **one address**:

| Address | What |
|---|---|
| `/` | public website (this folder's `source.html`, built into `apps/web/public/site/index.html`) |
| `/app` | the platform: sign in, create account (`/app?mode=register`), relationship network |
| `/verify`, `/reset`, `/dev/mailbox` | e-mail confirmation, new password, developer mailbox (local testing) |

The Android app opens the same address, so on the phone people see the website first and sign in inside the app
with the same account.

## Edit and build
Edit `source.html` (also used for the claude.ai preview), then `npm run site:build` (writes
`apps/web/public/site/index.html` with self-hosted fonts from `/site/fonts`, favicon `/site/favicon.svg`).

## Content and privacy
Four languages (Kurmanji draft, Arabic RTL, German, English), light/dark, phone and desktop layouts, living
relationship network and animated favicon (both stop for reduced motion). No cookies, no tracking, no third-party
requests. Only what exists or is clearly marked planned/test; no invented numbers, members or testimonials.

## Before going public (needs owner approval)
Online server and domain (EZ-18), Impressum and privacy policy pages, native review of the Kurmanji text.
