# EZIDINET — public website (static HTML)

One self-contained page (`index.html`) in Kurmanji, Arabic, German and English (Arabic right-to-left), light and dark
mode, phone and desktop layouts. No build step, no server code, no cookies, no tracking, **no third-party requests**
(fonts are self-hosted in `fonts/` — important for GDPR, e.g. Google Fonts rulings in Germany).

Content rules: describes only what exists or is clearly marked as planned/test; no invented numbers, members or
testimonials. The language follows the visitor's browser and can be switched; the choice is remembered locally.

## Motion
* The hero network is alive: people drift slowly, the centre breathes, rings ripple from it, and pulses travel along
  20 relationship lines between everyone (category colours). Hover or tap a person to highlight their connections.
* Animated favicon: the three-person mark rotates and a pulse travels between the people (canvas, 8 fps; SVG
  fallback `favicon.svg` animates on its own in Firefox).
* Everything stops for visitors who prefer reduced motion; the animation also pauses when the page is not visible.

## Files
`source.html` is the editable page (also published as the claude.ai preview); `python3 make_site.py source.html
index.html` produces the standalone `index.html` with self-hosted fonts.

## View
Open `index.html` in any browser (double-click). A private preview was also published as a claude.ai artifact.

## Publish (needs owner approval and a domain decision, EZ-18)
Any static host works by uploading this folder (e.g. the same EU server as the platform, or a static-site host).
Before going public: imprint/Impressum and privacy policy pages (legal requirement in Germany), final domain, and a
review of the Kurmanji text by a native speaker (current Kurmanji is a draft).
