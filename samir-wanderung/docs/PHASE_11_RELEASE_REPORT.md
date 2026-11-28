# Phase 11 — Global Hiking Explorer: Release Report

## Implemented
Globe exploration (Cesium) with continents, search, picking, eased flight and hand-off to 3D DEM terrain; satellite
and terrain views; return to globe. Also: the World Nature Atlas over 10 Wikidata categories with continent and
country filters, clustering and destination detail pages (sources, photos with attribution, official website,
elevation, coordinates), nearby OSM hiking relations, seasonal guidance (clearly labelled general), weather,
saved destinations, recent searches, sharing, and community integration (public events and routes map). See
GLOBAL_EXPLORER_REPORT.md for per-feature status.

## Providers
Wikidata (CC0), Wikimedia Commons (per-file licences), Nominatim/OSM (ODbL), Overpass/OSM, Valhalla/OSM,
OpenFreeMap, AWS Terrain Tiles, Esri imagery, Open-Meteo. Details in GEOGRAPHIC_DATA_SOURCES.md.

## Countries and regions actually tested
Germany, Iraq, Switzerland, Norway (Atlas, country-filtered); worldwide lists for all 10 categories in en/de/ar;
search tests for Germany, Iraq, Nepal, Erbil, Zürich, Cusco, Matterhorn, Kilimanjaro, Lake Titicaca,
Königssee, Gullfoss, Iguazu, Black Forest, Yosemite, Berchtesgaden and Tour du Mont Blanc. Arabic and Kurdish
queries: جبل حلكورد → Halgurd peak, أربيل / Hewlêr → Erbil. Routes were tested in the Wetterstein range
(Bavaria/Tyrol).

## Coverage limitations
Worldwide category lists are short where few items pass the popularity threshold (glaciers 3, canyons 2).
Trail metrics exist only for Valhalla-computed routes. No climate normals, official opening dates, closures or
access restrictions are integrated. Search misses are documented in GLOBAL_SEARCH_TESTS.md ("Halgurd" in English,
the alias "Monte Cervino", "Rennsteig"). **The globe shows the whole Earth, but data coverage is not worldwide or
uniform.**

## Build & tests
Typecheck and build PASS; vitest 51/51; E2E all stages pass (TEST_REPORT.md).

## Status
Global Explorer: **PARTIAL** overall. Globe, atlas, search and detail pages pass. Trails, seasons and weather
are partial. Official access data is not implemented.
