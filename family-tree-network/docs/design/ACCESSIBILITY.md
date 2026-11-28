# Accessibility

Target: WCAG 2.2 AA.

## Contrast (enforced by `apps/web/test/tokens.test.ts`)
| Pair | Ratio | Requirement |
|---|---|---|
| Deep Graphite on Warm Sand / Soft Cream | 11.6 / 12.6 : 1 | 4.5 ✔ |
| Secondary text `#716C65` on Warm Sand | 4.57 : 1 | 4.5 ✔ |
| Accent ink `#826658` on Warm Sand | 4.62 : 1 | 4.5 ✔ |
| Success `#6D6E5F`, danger `#9A4F43` | ≥ 4.5 : 1 | 4.5 ✔ |
| Soft Cream text on graphite buttons | 12.6 : 1 | 4.5 ✔ |
| All relationship line colours on the canvas | ≥ 3.0 : 1 | 3 (non-text) ✔ |

Deviation from the palette (documented in COLOR_TOKENS.md): Stone Gray and Muted Terracotta are used in slightly
deeper "ink" variants for small text, and the four accent hues in "line" variants for graph lines, because the original
values fall below WCAG thresholds on the light backgrounds.

## Colour independence
Category = colour **and** text label (edge labels, legend); status = line pattern **and** text badge with symbol;
direction = arrows. The low-saturation palette makes category hues close to each other, so labels must stay available
(the "Edge labels" toggle is on by default).

## Other measures
Visible graphite focus ring · keyboard-operable controls (native buttons, inputs) · `aria-pressed`, `aria-checked`,
`role=tab`, `role=alert` · `prefers-reduced-motion` disables animation · Arabic/German/English with correct `lang` and
`dir` · self-hosted fonts load without external requests.

## Known gaps (planned)
- The canvas graph is not screen-reader navigable; the relationship list in the person panel is the accessible
  equivalent. A full list/table view of the network is planned (R1.9 / R8 accessibility audit).
- Colour-vision-deficiency check of the five category hues: they are distinguishable by luminance only marginally —
  rely on labels; an optional per-category line pattern could be added if the owner wishes.
