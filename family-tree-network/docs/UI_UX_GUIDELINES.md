# UI / UX Guidelines

> **Visual sections superseded (2026-11-26)** by the Modern Luxury / Editorial Minimalism design system in `docs/design/`. Interaction rules (§5), screen list (§3) and RTL rules (§4) remain valid; colours, glow and typography below are historical.

The relationship graph **is** the visual identity. Everything else frames it.

## 1. Design tokens (`apps/web/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#071426` | page background, canvas |
| `--bg-2` | `#0D1B30` | bars, inputs, secondary surfaces |
| `--card` | `#13243D` | cards, nodes |
| `--gold` | `#E8B94F` | primary actions, focus person, friendship edges |
| `--gold-hi` | `#FFD978` | highlights, selected, path |
| `--blue` | `#25A9FF` | family edges |
| `--pink` | `#FF4D91` | marriage & partnership edges |
| `--purple` | `#A56BFF` | professional edges |
| `--green` | `#43D99A` | social edges, “confirmed” |
| `--text` | `#F5F7FC` | primary text |
| `--muted` | `#AAB7CA` | secondary text |
| radius | 16 px cards · 10 px controls · pills for buttons/chips |

Typography: Inter / Segoe UI for UI, Georgia (serif) for display names and the brand; Arabic falls back to
Noto Sans/Naskh Arabic, Tahoma. Body 14 px, small 12 px.

## 2. Graph visual language (`components/GraphCanvas.tsx`)

| Element | Encoding |
|---|---|
| Person | circular avatar (initial on navy radial gradient, gold ring) + name + derived kinship label below |
| Focus person | 78 px, bright gold border, soft gold halo |
| Viewer | gold border, “You” label when not in focus |
| Managed profile (child / ancestor) | dashed border |
| Has hidden connections | double border → double-click or “Expand” |
| Edge colour | category (family blue, union pink, friendship gold, professional purple, social green) with glow (`underlay`) |
| Edge pattern | solid = confirmed · dashed = pending · dotted = disputed · thicker = union |
| Edge direction | arrow for directed types (parent → child, manager → employee) |
| Edge label | relationship word (“Mother”, “Colleague”), toggleable |
| Selection | neighbourhood highlighted, everything else fades to 13 % |
| Path (“How are we connected?”) | path glows gold, rest fades, viewport fits the path |

**Never colour alone** (WCAG 1.4.1): every category also has a text label in the legend and on edges, and status uses
line patterns plus text badges (✓ … ! ×).

Layouts: **Network** (force-directed fcose, family edges shorter than social) and **Generations** (rows by generation,
spouses adjacent, children under parents, social circle in a column beside the focus person). Generations is mirrored in
RTL so families read right-to-left.

## 3. Screens

| Screen | Status |
|---|---|
| Welcome / Login / Registration (animated constellation hero) | ✅ |
| Main dashboard = Interactive Relationship Graph | ✅ |
| Person profile (side panel, field privacy, relationships, verification history) | ✅ |
| Relationship details (inline: sentence, dates, log, confirm/reject/dispute, visibility, remove) | ✅ |
| How Are We Connected? | ✅ |
| Add relationship (sentence builder: “[person] is the [type] of [me / a profile I manage]”, create profile for a child) | ✅ |
| Awaiting confirmation (inbox) | ✅ |
| People search (global search bar) | ✅ |
| Profile setup, Create/Join Family, Community management, Feed, Create post, Notifications, Messages, Memories, Events, Map, Family AI, Admin, Privacy settings, Account settings | 🗓 phases 1/3–7 |

## 4. RTL & languages

* Arabic is the default locale; `<html lang dir>` is set from the chosen language (persisted per browser).
* CSS uses **logical properties only** (`margin-inline-start`, `inset-inline-end`, `border-inline-start`…). Sidebar,
  panels, tabs and chain diagrams flip automatically (verified by e2e: sidebar moves right in Arabic).
* Graph labels come from the API in the requested language; Arabic kinship uses the correct paternal/maternal terms
  (عم، عمة، خال، خالة، ابن العم، ابنة الخالة، ابن الأخ، ابن الأخت) and in-law terms (الحمو، الحماة، الصهر، الكنّة، النسيب).
* Emails and passwords are always `dir="ltr"` inputs.
* Kurdish: add a dictionary in `lib/i18n.tsx` and labels in the engine catalog; Sorani is RTL — `dirOf()` must include it.

## 5. Interaction rules

* Single tap: select person (opens panel, highlights neighbourhood). Tap an edge: open that relationship.
* Double tap: expand / collapse a branch (progressive loading).
* Search: people already in view are centred; others become the new focus.
* Filters are single-choice presets matching the spec: All · Family (incl. marriage) · Friends · Professional · Social.
* Generation navigation: ▲ older / ▼ younger generation switches to the Generations layout and fits that row.
* Destructive actions (remove relationship) are explicit buttons, styled as danger, and audited server-side.
* Sensitive family facts show the note “only verified when both sides confirm” at creation and while pending.

## 6. Responsiveness & accessibility

* ≥ 1100 px: three columns (filters · graph · panel). 860–1100 px: narrower columns. < 860 px: stacked
  (top bar wraps, graph 60 vh, panel, filters). E2E checks no horizontal scrolling at 390 px.
* Visible focus ring (gold), `aria-pressed` / `aria-checked` / `role=tab` on toggles, `role=alert` on errors,
  `prefers-reduced-motion` disables animations.
* Contrast: text `#F5F7FC` on `#071426` ≈ 17:1; muted `#AAB7CA` ≈ 9:1; gold button text `#1A1204` on gold ≈ 10:1.
* Known gap: the canvas graph is not screen-reader navigable; the side panel's relationship list is the accessible
  equivalent. A full list view of the graph is planned (Phase 7).
