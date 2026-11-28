# Global Search Tests

Real queries executed on 2026-11-28T16:36:10.240Z against Nominatim through the SAMIR WANDERUNG server
(`/api/geocode`, results cached 24 h, max 1 upstream request/s). Results are reported exactly as returned.

| Category | Query | UI language | Top result | Coordinates (lat, lon) | Country | Time |
|---|---|---|---|---|---|---|
| Country | Germany | en | Germany (boundary/administrative) | 51.1638, 10.4478 | Germany | 339 ms |
| Country | Iraq | en | Iraq (boundary/administrative) | 33.0956, 44.1750 | Iraq | 1087 ms |
| Country | Nepal | en | Nepal (boundary/administrative) | 28.3780, 84.0000 | Nepal | 1084 ms |
| City | Erbil | en | Erbil (place/city) | 36.1912, 44.0094 | Iraq | 1168 ms |
| City | Zürich | de | Zürich (boundary/administrative) | 47.3744, 8.5410 | Schweiz | 1116 ms |
| City | Cusco | en | Cuzco (place/city) | -13.5171, -71.9785 | Peru | 1073 ms |
| Mountain | Matterhorn | en | Matterhorn (natural/peak) | 45.9764, 7.6586 | Switzerland | 960 ms |
| Mountain | Kilimanjaro | en | Kilimanjaro (natural/massif) | -3.0787, 37.4199 | Tanzania | 1306 ms |
| Mountain | Halgurd | en | Halgurd Substation (landuse/industrial) | 35.5882, 45.3368 | Iraq | 1070 ms |
| Mountain (alias) | Monte Cervino | en | Klimcentrum Monte Cervino (leisure/sports_centre) | 51.9772, 4.5361 | Netherlands | 1057 ms |
| Lake | Lake Titicaca | en | Lake Titicaca (water/lake) | -15.7597, -69.3762 | Peru | 928 ms |
| Lake | Königssee | de | Königssee (water/lake) | 47.5551, 12.9766 | Deutschland | 1324 ms |
| Waterfall | Gullfoss | en | Gullfoss (waterway/waterfall) | 64.3273, -20.1191 | Iceland | 849 ms |
| Waterfall | Iguazu Falls | en | Iguazu Falls (waterway/waterfall) | -25.6939, -54.4365 | Brazil | 1317 ms |
| Forest | Black Forest | en | Black Forest (boundary/natural) | 48.2634, 8.1647 | Germany | 1108 ms |
| National park | Yosemite National Park | en | Yosemite National Park (leisure/nature_reserve) | 37.8393, -119.5165 | United States | 1068 ms |
| National park | Nationalpark Berchtesgaden | de | Nationalpark Berchtesgaden (boundary/national_park) | 47.5530, 12.9255 | Deutschland | 922 ms |
| Hiking trail | Rennsteig | de | Rennsteig (railway/station) | 50.6152, 10.8354 | Deutschland | 1388 ms |
| Hiking trail | Tour du Mont Blanc | en | Tour du Mont-Blanc (information/map) | 45.8687, 6.7610 | France | 1105 ms |
| Arabic query | جبل حلكورد | ar | جبل هلكورد (natural/peak) | 36.7411, 44.8614 | العراق | 967 ms |
| Arabic query | أربيل | ar | أربيل (place/city) | 36.1912, 44.0094 | العراق | 1070 ms |
| Kurdish query | Hewlêr | ku | Hewlêr (place/city) | 36.1912, 44.0094 | Êraq | 1096 ms |
| German query | Zugspitze | de | Zugspitze (natural/peak) | 47.4212, 10.9863 | Deutschland | 1168 ms |

## Coordinate search
| Input | Handling |
|---|---|
| `47.4212, 10.9863` | parsed client-side by `parseCoordinates` (unit-tested) → [lon, lat] |
| `-13.1631, -72.5450` | parsed client-side by `parseCoordinates` (unit-tested) → [lon, lat] |
| `36.6366, 44.8846` | parsed client-side by `parseCoordinates` (unit-tested) → [lon, lat] |

## Other search surfaces
- **Nature Atlas** category + country filters (Wikidata) — see DATA_COVERAGE_REPORT.md for tested countries.
- **Hiking trails near a destination** — OSM route relations via Overpass (`/api/trails`).
- **Mountain Explorer** — named OSM peaks in the current map view (`/api/peaks`).
- **Recent searches / saved destinations** — stored locally (IndexedDB).

## Limitations
- Name search relies on Nominatim's OSM index; transliterations and Kurdish names work only where OSM has `name:*` tags.
- Nominatim is not a full-text trail database: long-distance trails are found only when mapped as named OSM relations.
- Search-as-you-type is debounced (450 ms) to respect the Nominatim usage policy.
