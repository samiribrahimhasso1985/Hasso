# Data Coverage Report

All numbers below come from real queries run on 2026-11-28. Showing the whole Earth on the globe does **not**
mean worldwide data coverage. Coverage differs by provider, region and language.

## Nature Atlas (Wikidata), worldwide, first page (limit 30, ranked by Wikipedia sitelinks)
Worldwide queries use direct `instance of` (P31) and a popularity threshold (> 40 sitelinks) so the public query
service answers in time. **That makes worldwide lists short for some categories.** Country-filtered queries include
direct subclasses and a lower threshold (> 2 sitelinks), so they return much more.

| Category | en | de | ar |
|---|---|---|---|
| Mountains | 30 (30 elevation, 30 image, 30 description) | 30 | 30 |
| Mountain ranges | 30 (30/30/30) | 30 | 30 |
| Lakes | 30 (30/30/30) | 30 | 30 (29 descr.) |
| Waterfalls | 11 (5/11/11) | 11 | 11 |
| Forests | 9 (4/9/9) | 9 | 9 (8 descr.) |
| National parks | 30 (6/30/30) | 30 | 30 (11 descr.) |
| Nature reserves | 10 (4/10/10) | 10 | 10 |
| Valleys | 22 (8/22/22) | 22 | 22 (20 descr.) |
| Glaciers | **3** | 3 | 3 |
| Canyons | **2** | 2 | 2 |

Kurdish (`ku`) has no seed. Live queries fall back to English labels where Wikidata has no Kurdish label.

## Countries and regions actually tested (live)
| Country | Query | Result |
|---|---|---|
| Germany (Q183) | lakes | 10 lakes, e.g. Lake Constance 395 m, Chiemsee 518 m, Lake Starnberg 584 m, Königssee 603 m |
| Germany | forests / nature reserves | Black Forest, Teutoburg Forest, Palatinate Forest…; Taubergießen, Schorfheide-Chorin… |
| Iraq (Q796) | mountains | 10, incl. Cheekha Dar 3611 m, Halgurd 3607 m |
| Switzerland (Q39) | glaciers / valleys | Rhône Glacier, Morteratsch, Unteraar, Fiescher; Engadin, Emmental, Mattertal… |
| Norway (Q20) | waterfalls | Seven Sisters, Vinnufossen, Vøringsfossen, Låtefossen… |
| Worldwide | mountains / national parks / waterfalls / ranges | Everest, Fuji, Vesuvius, Mont Blanc; Yellowstone, Yosemite; Niagara, Victoria, Iguazu, Angel Falls; Alps, Himalayas, Andes, Rockies |

Every Wikidata country ID in the country filter (75 countries) was checked automatically against Wikidata's
English labels (test `Wikidata country IDs match their labels`: pass).

## Hiking routes (Valhalla on OSM)
- Tested routes: Eibsee → Zugspitze (15.84 km, ↑2294 m, mountain profile), Eibsee → Knorrhütte → Zugspitze
  (30.72 km), Garmisch round trip with a stop (2 legs), and mid-Atlantic points (correctly reported as **no route**).
- Coverage: worldwide OSM. Quality depends on local mapping (paths, `sac_scale`, `surface`). Sparse or remote areas
  may lack paths. **A missing route never means the area has no trails.**
- Alternatives: Valhalla only computes them for start/destination requests without stops, and often returns none
  for mountain routes (the Eibsee–Zugspitze test got 1 route).

## Hiking trail discovery (OSM route relations via Overpass)
- `route=hiking|foot` relations within 10 km of a destination. Overpass is a shared public service, and from this
  test environment it was intermittently unreachable (connection dropped by the network proxy). The UI shows the
  error and a retry button; it never shows an empty "no trails" state for a failed request.

## Weather
- Open-Meteo, global model data. From this test environment the free API often answered **429 (rate limited)**
  because of the shared outbound IP. The UI then shows "Weather data unavailable" with a retry button.
- No official weather-warning feed is integrated. The UI says so and links to MeteoAlarm and EAWS.

## Trail closures, restrictions, avalanche bulletins, seasonal opening dates
**Not integrated.** No verified machine-readable source is connected, and the UI states this for every destination
and in the Safety Center. Seasonal notes are explicitly general guidance, not verified access information.

## Terrain & imagery
- DEM: global (SRTM/GMTED/ETOPO1 and national datasets). Resolution varies: about 30 m in most land areas,
  coarser at high latitudes and at sea.
- Satellite imagery: global (Esri), display only, not available offline.
- Cesium globe: Esri imagery on a smooth ellipsoid unless a Cesium ion token is configured.
