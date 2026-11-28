# Global Hiking Explorer Report (Phase 11)

## Implemented
| Feature | Where | Data source | Status |
|---|---|---|---|
| Interactive 3D Earth, rotation, zoom, mouse/touch, picking | World Explorer (`GlobeEngine`) | Esri imagery + boundaries/places | PASS (automated, software WebGL) |
| Continent selection (7, incl. Antarctica, which is discovery only) | World Explorer, Nature Atlas | real continent centroids | PASS |
| Country / region selection | Atlas country filter (75 countries, IDs verified against Wikidata) | Wikidata | PASS |
| Cinematic flight globe → terrain (eased, two-stage, crossfade, reveal orbit) | World Explorer | Cesium + MapLibre DEM | PASS (Matterhorn test) |
| Satellite / terrain views, return to globe | World Explorer, MapView | Esri, AWS terrain | PASS |
| Natural destination markers with clustering | Nature Atlas map | Wikidata | PASS |
| Search from the globe | World Explorer search | Nominatim | PASS |
| World Nature Atlas, 10 categories | Nature Atlas | Wikidata (CC0) | PASS. Worldwide lists are short for glaciers and canyons (see DATA_COVERAGE_REPORT) |
| Destination detail: name, original name, country, coordinates, elevation, description, photo + attribution, official site, Wikipedia, source Q-ID, fetch time | Atlas detail | Wikidata / Commons | PASS |
| Nearby hiking trails | Atlas detail | Overpass (OSM route relations) | PARTIAL: Overpass was intermittently unreachable from the test environment |
| Open in 3D / plan a hike / save / share | Atlas detail | — | PASS (save is local, share uses Web Share or clipboard) |
| Season explorer | Atlas detail | general guidance, labelled as such | PARTIAL: no climate-normal dataset or verified opening dates |
| Weather on destination | Atlas detail | Open-Meteo | PARTIAL: often rate-limited (429) from the test environment |
| Global search (countries, cities, mountains, lakes, waterfalls, forests, parks, trails, coordinates) | All search fields | Nominatim + hiking-oriented ranking | PASS with documented misses (GLOBAL_SEARCH_TESTS.md) |
| Recent searches, saved destinations | Atlas | IndexedDB | PASS (manual check) |
| Community integration (public events and routes on a map, privacy-filtered) | Community → map tab | own DB | PASS (server tests) |
| Trail comparison / filters by distance, elevation gain, difficulty | Journey Planner route comparison | Valhalla | PARTIAL: comparison covers Valhalla alternatives only, and OSM relations have no computed stats |

## Not implemented
- A verified worldwide trail database with per-trail distance, elevation gain and difficulty. OSM relations are
  listed, but metrics are computed only for routes calculated by Valhalla.
- Climate normals (monthly averages) per destination.
- Official seasonal opening dates, closures and access restrictions.
- Multilingual search aliases beyond what OSM and Wikidata already contain.

## Performance
- Atlas queries are cached on the server (6 h) and pre-seeded with real results (30-day seed) for en/de/ar
  worldwide. Uncached live Wikidata queries take 1–60 s.
- Clustering keeps the global map to ≤ 3 marker layers. Labels appear from zoom 4. Images are lazy-loaded
  thumbnails (Commons width parameter).
- Low-power mode switches maps to 2D and turns fades off. Without WebGL a fallback message is shown.
