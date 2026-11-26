# Colour Tokens

## Approved palette (owner-specified — do not change without approval)
| Name | Hex | Primary use |
|---|---|---|
| Warm Sand | `#F3F0E9` | page background |
| Pale Beige | `#E9E5DC` | secondary surfaces, avatars, hero |
| Soft Cream | `#FAF9F5` | cards, panels, graph canvas |
| Deep Graphite | `#30302D` | text, primary buttons, focus person, path highlight |
| Stone Gray | `#858078` | decorative text/icons ≥ 18 px, borders on hover, social lines |
| Warm Gray | `#DDD8CE` | borders, dividers |
| Muted Terracotta | `#B58F7B` | accent (marriage hue) |
| Dusty Olive | `#989985` | family hue |
| Slate Blue Gray | `#87939A` | friendship hue |
| Soft Cocoa | `#A18D80` | professional hue |

## Contrast-safe variants (same hue, deepened)
The muted palette is beautiful but several colours do not reach WCAG minimums on the light backgrounds
(measured against Warm Sand / Soft Cream):

| Colour | As specified | Needed | Variant used | Result |
|---|---|---|---|---|
| Stone Gray as small text | 3.44 : 1 | 4.5 : 1 | `#716C65` (`--text-2`) | 4.57 : 1 |
| Muted Terracotta as small text | 2.57 : 1 | 4.5 : 1 | `#826658` (`--accent-ink`) | 4.62 : 1 |
| Dusty Olive line | 2.55 : 1 | 3 : 1 | `#8B8C7A` | 3.01 : 1 |
| Muted Terracotta line | 2.57 : 1 | 3 : 1 | `#A68371` | 3.02 : 1 |
| Slate Blue Gray line | 2.77 : 1 | 3 : 1 | `#808B92` | 3.06 : 1 |
| Soft Cocoa line | 2.78 : 1 | 3 : 1 | `#9A877A` | 3.01 : 1 |

Original palette values remain the canonical colours for large areas (fills, swatches, illustrations).

## Semantic tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | Warm Sand | page |
| `--surface` | Soft Cream | cards, bars, panels |
| `--surface-alt` | Pale Beige | segmented controls, tags, hero |
| `--border` | Warm Gray | 1 px borders |
| `--text` | Deep Graphite | body text (11.6 : 1) |
| `--text-2` | `#716C65` | secondary text |
| `--accent` / `--accent-ink` | Terracotta / `#826658` | accent fills / accent text & links |
| `--success` | `#6D6E5F` (olive ink) | confirmed |
| `--danger` | `#9A4F43` | errors, destructive actions |
| `--verified-blue` | `#2F6FB3` | verified badge only |

## Relationship categories (graph lines, legend, path chain)
| Category | Line colour | Additional encoding |
|---|---|---|
| Family | `#8B8C7A` (Dusty Olive) | arrow for parent → child |
| Marriage & partners | `#A68371` (Muted Terracotta) | thicker line (2.8 px) |
| Friendship | `#808B92` (Slate Blue Gray) | — |
| Professional | `#9A877A` (Soft Cocoa) | arrow for manager → employee |
| Social | `#858078` (Stone Gray) | — |
| Custom | `#716C65` | custom text label |
| Status | — | solid = confirmed · dashed = pending · dotted = disputed |

Because the palette is deliberately low-saturation, categories are close in colour; every edge carries a text label
(toggleable) and the legend names each category. See ACCESSIBILITY.md.
