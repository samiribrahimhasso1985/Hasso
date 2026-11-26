# Typography

| Script | Typeface | Delivery |
|---|---|---|
| Latin (English, German) | **Inter** 400 / 500 / 600 | self-hosted via `@fontsource/inter` (no requests to Google from users' browsers — GDPR) |
| Arabic | **IBM Plex Sans Arabic** 400 / 500 / 600 | self-hosted via `@fontsource/ibm-plex-sans-arabic`; fallback Noto Sans Arabic, system |

In RTL the Arabic face is listed first; in LTR Inter is first (mixed names render with the right face either way).

## Scale
| Role | Size / weight | Notes |
|---|---|---|
| Hero heading | 44 px / 500 (30 px on phones) | line-height 1.15 |
| Panel title | 20 px / 500 | person name |
| Body | 14 px / 400, line-height 1.5 | |
| Small / meta | 12 px | secondary text colour |
| Section label | 11 px / 500, uppercase, letter-spacing 0.12 em | **no letter-spacing and no uppercase effect in Arabic** |
| Brand word "FAMILY NETWORK" | 12–13 px / 600, letter-spacing 0.2–0.32 em | brand name is not translated |
| Graph labels | 11 px (focus 13 px / 600), 9 px edge labels | text outline in canvas colour for legibility |

## Rules
- Headings use weight 500–600, never bold-black; editorial feel comes from size and space, not weight.
- Arabic: no letter-spacing (it breaks joined letters), no italics, no uppercase transforms.
- Numbers and emails in forms are LTR (`dir="ltr"`) inside RTL layouts.
