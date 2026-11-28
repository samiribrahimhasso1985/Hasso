# Geographic Data Sources & Attribution

Every provider is declared in `src/config/providers.ts` (attribution + licence URL + offline policy) and shown in the
app (map attribution control, Settings → "Map & data attribution", per-page attribution lists).

| Data | Provider | Licence / terms | Attribution shown | Offline caching |
|---|---|---|---|---|
| Vector basemap (roads, paths, water, forests, labels) | **OpenFreeMap** (OpenMapTiles schema, OSM data) | OSM data ODbL; OpenFreeMap free public instance | "© OpenFreeMap © OpenMapTiles Data from © OpenStreetMap contributors" | **Yes** (Offline Maps, capped at 4 000 tiles/region) |
| Elevation / 3D terrain / hillshade / contours | **Terrain Tiles on AWS** (Mapzen/Tilezen Terrarium; SRTM, GMTED, ETOPO1, USGS NED …) | AWS Open Data, attribution required | "Elevation: Terrain Tiles (Mapzen/Tilezen) …" | **Yes** |
| Satellite imagery (map + globe) | **Esri World Imagery** | Esri terms; display only | "Imagery © Esri, Maxar, Earthstar Geographics …" | **No** |
| Globe boundaries & place labels | Esri World Boundaries and Places | Esri terms | "Boundaries & places © Esri" | No |
| Hiking routing, elevation sampling, surfaces, SAC scale | **Valhalla** (FOSSGIS public server), OSM data | Valhalla MIT; data ODbL; demo-server fair use | "Routing © Valhalla / FOSSGIS e.V., data © OpenStreetMap contributors" | No (computed routes are stored locally) |
| Geocoding & reverse geocoding | **Nominatim** (OSMF) | ODbL; max 1 req/s, caching required | "Geocoding © OpenStreetMap contributors (ODbL) via Nominatim" | No |
| Peaks, hiking route relations | **Overpass API** (OSM) | ODbL | "Trail data © OpenStreetMap contributors" | No |
| Nature Atlas destinations (names, coordinates, elevation, country, description, website, image link) | **Wikidata** SPARQL | CC0 | "Wikidata (CC0)" + per-item Q-ID link | Seed cache (30 days) |
| Destination photos | **Wikimedia Commons** (via Wikidata P18) | per file (CC BY/BY-SA/PD) | link to each file page for author & licence | No |
| Weather | **Open-Meteo** | CC BY 4.0 | "Weather data by Open-Meteo.com (CC BY 4.0)" + fetch time | No |
| Globe engine | CesiumJS | Apache-2.0 | Cesium credit display | — |
| Emergency numbers | European Commission (112), national authorities | public information | source shown per number | bundled |

## Rules enforced in code
- No fabricated geography: the app never invents routes, coordinates, elevations, trails, closures or weather.
  When a provider fails, the UI shows an error or "unknown".
- Elevation values of `-32768`/no-data from Valhalla are treated as unknown, never interpolated into fake heights.
- Atlas items are deduplicated by Wikidata Q-ID; coordinates are validated (|lat| ≤ 90, |lon| ≤ 180).
- Offline downloads only use providers with `offlineAllowed: true`.
- Official status (e.g. "national park") is taken from the Wikidata class only; no official claims are derived from
  combining sources.
