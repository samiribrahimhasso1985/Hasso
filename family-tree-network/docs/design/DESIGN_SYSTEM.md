# FAMILY NETWORK Design System — Modern Luxury / Editorial Minimalism

Approved by the product owner (CLAUDE.md §31, v2 §26). Replaces the earlier Dark Navy & Gold identity (§3) and the
Soft Minimalism proposal (§25). Implemented in R1.0 (2026-11-26).

## Principles
Elegant, not flashy · modern, not futuristic · minimal, not empty · professional, not corporate-heavy · warm, not
childish · calm, not boring. The relationship graph remains the visual heart of the product.

## Rules
- No neon, no saturated colour overload, no excessive gradients, **no glow**.
- Generous white space, thin borders (1 px Warm Gray), subtle shadows, rounded cards (18 px) and controls (12 px / pill).
- One primary action colour: **Deep Graphite** (buttons, focus person, path highlight, focus ring).
- Accent: **Muted Terracotta** (ink variant for links and small accent text).
- The verified badge may use its official blue (`#2F6FB3`) as a controlled status indicator — nowhere else.
- Never rely on colour alone (labels, line patterns and text badges carry meaning).

## Documents
| Document | Content |
|---|---|
| [COLOR_TOKENS.md](COLOR_TOKENS.md) | palette, semantic tokens, contrast-safe variants, relationship colours |
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | typefaces, scale, Arabic rules |
| [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) | buttons, cards, inputs, badges, graph, panels |
| [RESPONSIVE_LAYOUT.md](RESPONSIVE_LAYOUT.md) | breakpoints, navigation model, RTL |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | contrast results, keyboard, motion, known gaps |

## Source of truth in code
- `apps/web/lib/tokens.ts` — palette + semantic tokens (TypeScript).
- `apps/web/app/globals.css` — the same tokens as CSS custom properties.
- `packages/relationship-engine/src/catalog.ts` `CATEGORY_COLORS` — relationship line colours, used by API, graph and legend.
- `apps/web/test/tokens.test.ts` — fails if CSS and TS disagree, if legacy neon colours return, or if contrast drops below WCAG thresholds.

## Not yet implemented
Dark mode (not requested in v2; the token layer is ready for a second theme) · icon set (current UI uses text and
minimal glyphs) · More Services screen and bottom navigation (built when the corresponding modules exist — no
placeholder buttons).
