# Responsive Layout

| Width | Layout |
|---|---|
| ≥ 1100 px | three columns: filters sidebar 250 px · graph · right panel 370 px; top bar 64 px |
| 860–1100 px | sidebar 210 px · graph · panel 320 px |
| < 860 px | single column: top bar (wraps; search full width) · graph 60 vh · panel · filters; welcome screen stacks hero above form |

Verified: no horizontal scrolling at 390 px (e2e test), dashboard starts at the top after login on phones.

## Navigation model (v2 §27) — to be built with the modules
- **Mobile:** bottom bar Home · My Network · Discover · Messages · Profile; contextual Create; **More Services** screen
  for Videos, Families, Events, Memories, Family History, Interviews, Live, Celebrity Studio, Global Map, Family AI,
  Trust Center, Professional Network.
- **Desktop:** left sidebar with main areas, central content, right panel (events, requests, suggestions, activity).
- Only modules that actually work appear in navigation (no placeholder buttons).

## RTL
All layout CSS uses logical properties (`margin-inline-*`, `inset-inline-*`, `border-inline-*`); the document `dir`
switches with the language; the generations layout is mirrored in RTL. Verified by e2e (sidebar moves to the right in
Arabic, back to the left in German).
