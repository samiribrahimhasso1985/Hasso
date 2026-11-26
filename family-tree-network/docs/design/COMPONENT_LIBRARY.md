# Component Library

Current components (`apps/web/components`) and their design rules.

| Component | Rules |
|---|---|
| **Button** `.btn` | pill, 1 px Warm Gray border, Soft Cream fill; primary `.btn.primary` (alias `.btn.gold` kept for compatibility) = Deep Graphite fill + Soft Cream text; `.small`, `.ghost`, `.danger` (brick text, light border). No gradients, no glow. |
| **Card** `.card` | Soft Cream, 1 px border, radius 18 px, two-layer subtle shadow. |
| **Input / select** | Soft Cream, 1 px border, radius 12 px; focus = Stone Gray border + soft ring. |
| **Segmented control** | Pale Beige track, selected segment Soft Cream with hairline shadow. |
| **Tag** | Pale Beige pill, secondary text; `.tag.gold` (= emphasis) graphite pill. |
| **Status badge** `StatusBadge` | text + symbol (✓ … ! ×) + tinted background: confirmed olive, pending terracotta, disputed brick, rejected neutral. |
| **Language switch** | Pale Beige pill group; active option on Soft Cream. |
| **Logo** | graphite central node with four thin category-coloured connections. |
| **Graph canvas** `GraphCanvas` | Soft Cream canvas with a faint dot grid; nodes = initials avatars on Pale Beige (focus node graphite with cream initial); 1.5 px rings (dashed for managed profiles, double ring = expandable); lines 1.8 px (unions 2.8 px) in category colours; path highlight = 4 px graphite; selection fades others to 18 % opacity. |
| **Legend** | category line swatches + names; pending (dashed) and disputed (dotted) samples. |
| **Person panel** | avatar, name, derived kinship (accent ink), tags, facts grid with privacy-hidden markers (🔒), relationship rows with category dot, label and status badge. |
| **Relationship detail** | sentence "A is the X of B", dates, verification history, actions (confirm / reject / dispute / visibility / remove). |
| **Connect panel** | two person pickers, verdict banner, vertical chain with category-coloured connectors. |
| **Inbox item** | card with sentence and confirm / reject. |
| **Modal** | graphite 32 % backdrop, Soft Cream card. |
| **Person picker** | search field + floating result list (Soft Cream, hairline shadow). |

Planned components (built with their modules): bottom navigation, More Services grid, Digital ID card / Family Passport,
QR display & scanner, verified badge (official blue + click explanation in ar/en), role cards (§32), identity section
cards (§33), photo editor (§29).
