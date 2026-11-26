# EZIDNET — Relationship Engine (v1.1 delta)

The engine (`packages/relationship-engine`, 53 tests) is reused unchanged in its rules. Full description:
`../RELATIONSHIP_ENGINE.md`. This document lists only the EZIDNET changes.

## 1. Kept as is
People = nodes, relationships = edges · canonical storage + derived kinship · structural validation · two-sided
verification with distinct confirmers for sensitive facts · stewards/guardians for unclaimed profiles · "How Are We
Connected?" over **confirmed** edges only · privacy filtering before any algorithm · minors protected.

## 2. Changes
| Change | Detail |
|---|---|
| Status wording | spec says *proposed, confirmed, rejected, disputed*: `PENDING` is displayed as "Proposed"; `REMOVED` added (soft removal + history) |
| Kurmanji (`ku`) labels | new locale for every type and every derived kinship term (draft below — **requires native-speaker review**) |
| Family Circles | named audiences (e.g. "Close family", "My village relatives") built from confirmed relationships or chosen people; used for sharing, never as relationships themselves |
| QR → request | scanning resolves an EZID profile and opens *Choose relationship → Request*; never a confirmed edge |
| Children | child profiles are graph nodes visible only within the family audience; no relationship requests from or to children except by their guardians |

## 3. Draft Kurmanji kinship vocabulary (to be reviewed)
| Concept | Kurmanji (Latin) draft | Note |
|---|---|---|
| father / mother | bav / dayik (dê) | |
| son / daughter | kur / keç | |
| brother / sister | bira / xwişk | |
| grandfather / grandmother | bapîr / dapîr | |
| grandchild | nevî | |
| paternal uncle / maternal uncle | mam / xal | Kurmanji distinguishes sides like Arabic |
| paternal aunt / maternal aunt | met / xaltî | |
| cousin (son of paternal uncle) | pismam | other cousin forms to be confirmed |
| husband / wife | mêr / jin | |
| friend | heval | |
| colleague | hevkar | |

The engine already records paternal/maternal side and the uncle/aunt gender on kinship paths, so these distinctions
can be produced exactly as for Arabic once the vocabulary is confirmed. Regional and dialect variation (e.g. Sinjar,
Shekhan, diaspora usage) must be decided with community reviewers.

## 4. Tests to add
Kurmanji label completeness test (like the existing ar/de/en tests) · "Proposed" display mapping · REMOVED excluded
from graph and paths but kept in history · circles never create or change relationships · child nodes invisible to
non-family viewers.
