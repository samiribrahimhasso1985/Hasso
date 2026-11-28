// Geographic provider proxies: geocoding, routing, elevation, surfaces, weather, trails, atlas.
import { Cache, HttpError, serialQueue, upstream, validLonLat, isNum } from './lib.mjs';

const VALHALLA = (process.env.VALHALLA_URL || 'https://valhalla1.openstreetmap.de').replace(/\/$/, '');
const NOMINATIM = (process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const OVERPASS_URLS = (process.env.OVERPASS_URLS || 'https://overpass-api.de/api/interpreter').split(',').map((s) => s.trim()).filter(Boolean);
async function overpass(query, timeout = 40_000) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) for (const u of OVERPASS_URLS) {
    try { return await upstream(u, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'content-type': 'application/x-www-form-urlencoded' } }, timeout); }
    catch (e) { last = e; }
  }
  throw last;
}
const OPEN_METEO = process.env.OPEN_METEO_URL || 'https://api.open-meteo.com/v1/forecast';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

const geoCache = new Cache(2000, 24 * 3600_000);
const nominatimQueue = serialQueue(1100);
const valhallaQueue = serialQueue(250);
const weatherCache = new Cache(500, 15 * 60_000);
const atlasCache = new Cache(2000, 6 * 3600_000);
// Seed cache: real Wikidata results fetched by scripts/prefetch-atlas.mjs (kept for 30 days).
import { readFileSync as _rf, existsSync as _ex } from 'node:fs';
const SEED_FILE = new URL('./data/atlas-seed.json', import.meta.url);
const seed = new Map();
try {
  if (_ex(SEED_FILE)) for (const [k, v] of Object.entries(JSON.parse(_rf(SEED_FILE, 'utf8'))))
    if (Date.now() - Date.parse(v.fetchedAt) < 30 * 86400_000) seed.set(k, v);
} catch { /* ignore broken seed */ }
export const atlasKey = (category, country, lang, off, lim) => `${category}|${country ?? ''}|${lang}|${off}|${lim}`;
const trailCache = new Cache(300, 6 * 3600_000);

export async function geocode({ q, limit = 6, lang = 'en' }) {
  if (typeof q !== 'string' || q.trim().length < 2 || q.length > 200) throw new HttpError(400, 'invalid_query');
  const key = `${lang}|${limit}|${q.trim().toLowerCase()}`;
  const hit = geoCache.get(key); if (hit) return hit;
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&extratags=1&namedetails=1&limit=${Math.min(10, +limit || 6)}&q=${encodeURIComponent(q.trim())}`;
  const data = await nominatimQueue(() => upstream(url, { headers: { 'accept-language': lang } }));
  const out = {
    provider: 'nominatim', attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
    results: data.map((r) => ({
      name: r.name || r.display_name.split(',')[0], displayName: r.display_name,
      lon: +r.lon, lat: +r.lat, category: r.category, type: r.type, osm: `${r.osm_type}/${r.osm_id}`,
      bbox: r.boundingbox?.map(Number), country: r.address?.country, countryCode: r.address?.country_code,
      elevation: r.extratags?.ele ? parseFloat(r.extratags.ele) : null,
      wikidata: r.extratags?.wikidata ?? null, originalName: r.namedetails?.name ?? null,
    })),
  };
  geoCache.set(key, out);
  return out;
}

export async function reverse({ lon, lat, lang = 'en' }) {
  if (!validLonLat(lon, lat)) throw new HttpError(400, 'invalid_coordinates');
  const key = `rev|${lang}|${lon.toFixed(4)}|${lat.toFixed(4)}`;
  const hit = geoCache.get(key); if (hit) return hit;
  const data = await nominatimQueue(() => upstream(`${NOMINATIM}/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lon}`, { headers: { 'accept-language': lang } }));
  const out = { name: data.name || data.display_name?.split(',')[0] || null, displayName: data.display_name ?? null, countryCode: data.address?.country_code ?? null };
  geoCache.set(key, out);
  return out;
}

function validateRouteBody(b) {
  if (!b || !Array.isArray(b.locations) || b.locations.length < 2 || b.locations.length > 12) throw new HttpError(400, 'invalid_locations');
  for (const l of b.locations) if (!validLonLat(l.lon, l.lat)) throw new HttpError(400, 'invalid_coordinates');
  if (b.costing !== 'pedestrian') throw new HttpError(400, 'only_pedestrian_costing');
  const allowed = ['max_hiking_difficulty', 'use_hills', 'walkway_factor', 'sidewalk_factor', 'use_tracks', 'use_living_streets', 'service_penalty', 'use_ferry', 'shortest'];
  const po = b.costing_options?.pedestrian ?? {};
  const clean = {};
  for (const k of allowed) if (k in po) clean[k] = po[k];
  return {
    locations: b.locations.map((l) => ({ lon: l.lon, lat: l.lat, type: l.type === 'through' ? 'through' : 'break' })),
    costing: 'pedestrian', costing_options: { pedestrian: clean },
    alternates: Math.max(0, Math.min(2, +b.alternates || 0)), units: 'kilometers', directions_type: 'maneuvers',
    language: typeof b.language === 'string' ? b.language.slice(0, 5) : 'en-US',
  };
}

export async function route(body) {
  const req = validateRouteBody(body);
  try {
    return await valhallaQueue(() => upstream(`${VALHALLA}/route`, { method: 'POST', body: JSON.stringify(req), headers: { 'content-type': 'application/json' } }, 45_000));
  } catch (e) {
    // Valhalla returns 400 with error_code 442 "No path could be found" — surface it as no_route.
    if (e instanceof HttpError && e.detail?.status === 400) throw new HttpError(404, 'no_route', e.detail.body);
    throw e;
  }
}

export async function height({ polyline }) {
  if (typeof polyline !== 'string' || polyline.length > 200_000) throw new HttpError(400, 'invalid_polyline');
  const data = await valhallaQueue(() => upstream(`${VALHALLA}/height`, { method: 'POST', body: JSON.stringify({ encoded_polyline: polyline, shape_format: 'polyline6' }), headers: { 'content-type': 'application/json' } }));
  // Valhalla returns -32768 for "no data"; map to null rather than inventing a height.
  return { provider: 'valhalla-height', heights: (data.height || []).map((h) => (isNum(h) && h > -1000 ? h : null)) };
}

export async function attributes({ polyline }) {
  if (typeof polyline !== 'string' || polyline.length > 200_000) throw new HttpError(400, 'invalid_polyline');
  const data = await valhallaQueue(() => upstream(`${VALHALLA}/trace_attributes`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ encoded_polyline: polyline, shape_match: 'map_snap', costing: 'pedestrian', filters: { attributes: ['edge.surface', 'edge.sac_scale', 'edge.length', 'edge.use'], action: 'include' } }),
  }, 45_000));
  const bySurface = new Map(); let maxSac = null;
  for (const e of data.edges || []) {
    const s = e.surface || 'unknown';
    bySurface.set(s, (bySurface.get(s) || 0) + (e.length || 0));
    if (isNum(e.sac_scale)) maxSac = Math.max(maxSac ?? 0, e.sac_scale);
  }
  return { surfaces: [...bySurface].map(([surface, km]) => ({ surface, km: Math.round(km * 100) / 100 })).sort((a, b) => b.km - a.km), maxSac };
}

export async function weather({ lon, lat }) {
  if (!validLonLat(lon, lat)) throw new HttpError(400, 'invalid_coordinates');
  const key = `${lon.toFixed(2)}|${lat.toFixed(2)}`;
  const hit = weatherCache.get(key); if (hit) return hit;
  const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,weather_code&forecast_days=3&timezone=auto`;
  const data = await upstream(url);
  const out = { provider: 'open-meteo', attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)', fetchedAt: new Date().toISOString(), alerts: null, alertsNote: 'Open-Meteo does not provide official weather warnings.', ...data };
  weatherCache.set(key, out);
  return out;
}

/** Hiking route relations (route=hiking/foot) near a point from OSM via Overpass. */
export async function trails({ lon, lat, radiusKm = 10 }) {
  if (!validLonLat(lon, lat)) throw new HttpError(400, 'invalid_coordinates');
  const r = Math.max(1, Math.min(25, +radiusKm || 10)) * 1000;
  const key = `${lon.toFixed(3)}|${lat.toFixed(3)}|${r}`;
  const hit = trailCache.get(key); if (hit) return hit;
  const q = `[out:json][timeout:25];relation(around:${r},${lat},${lon})["type"="route"]["route"~"^(hiking|foot)$"];out tags center 60;`;
  const data = await overpass(q);
  const out = {
    provider: 'overpass', attribution: 'Trail data © OpenStreetMap contributors', fetchedAt: new Date().toISOString(),
    trails: (data.elements || []).map((e) => ({
      id: `relation/${e.id}`, name: e.tags?.name || e.tags?.ref || null, ref: e.tags?.ref ?? null, network: e.tags?.network ?? null,
      distance: e.tags?.distance ?? null, operator: e.tags?.operator ?? null, website: e.tags?.website ?? null,
      osmc: e.tags?.['osmc:symbol'] ?? null, center: e.center ? [e.center.lon, e.center.lat] : null, from: e.tags?.from ?? null, to: e.tags?.to ?? null,
    })),
  };
  trailCache.set(key, out);
  return out;
}

/** Peaks in a bbox from OSM (natural=peak with name). */
export async function peaks({ west, south, east, north }) {
  for (const v of [west, south, east, north]) if (!isNum(v)) throw new HttpError(400, 'invalid_bbox');
  if ((east - west) * (north - south) > 1.0) throw new HttpError(400, 'bbox_too_large');
  const q = `[out:json][timeout:25];node["natural"="peak"]["name"](${south},${west},${north},${east});out 80;`;
  const data = await overpass(q);
  return {
    provider: 'overpass', attribution: 'Peak data © OpenStreetMap contributors',
    peaks: (data.elements || []).map((e) => ({ id: `node/${e.id}`, name: e.tags.name, lon: e.lon, lat: e.lat, ele: e.tags.ele ? parseFloat(e.tags.ele) : null, wikidata: e.tags.wikidata ?? null }))
      .sort((a, b) => (b.ele ?? -1) - (a.ele ?? -1)),
  };
}

// Wikidata classes for the Nature Atlas. Every result is a real Wikidata item.
export const ATLAS_CLASSES = {
  mountain: 'Q8502', range: 'Q46831', lake: 'Q23397', waterfall: 'Q34038', forest: 'Q4421',
  nationalPark: 'Q46169', reserve: 'Q179049', valley: 'Q39816', glacier: 'Q35666', canyon: 'Q150784',
};

export async function atlas({ category, country, lang = 'en', offset = 0, limit = 30 }) {
  const cls = ATLAS_CLASSES[category];
  if (!cls) throw new HttpError(400, 'invalid_category');
  if (country && !/^Q\d+$/.test(country)) throw new HttpError(400, 'invalid_country');
  const off = Math.max(0, Math.min(2000, +offset || 0)), lim = Math.max(1, Math.min(50, +limit || 30));
  const l = ['en', 'de', 'ar', 'ku'].includes(lang) ? lang : 'en';
  const key = atlasKey(category, country, l, off, lim);
  const hit = atlasCache.get(key) ?? seed.get(key); if (hit) return hit;
  // Sitelinks count is used as a popularity proxy so well-known places come first.
  // GROUP BY item so multi-valued properties (several coords/images) do not consume the LIMIT.
  const label = (v, prop, langs) => `OPTIONAL { ?item ${prop} ?${v}_. FILTER(LANG(?${v}_) IN (${langs})) }`;
  const sparql = `SELECT ?item ?links (SAMPLE(?coord_) AS ?coord) (SAMPLE(?ele_) AS ?ele) (SAMPLE(?image_) AS ?image) (SAMPLE(?website_) AS ?website)
  (SAMPLE(?lbl_) AS ?itemLabel) (SAMPLE(?en_) AS ?enLabel) (SAMPLE(?orig_) AS ?origLabel) (SAMPLE(?desc_) AS ?desc) (SAMPLE(?article_) AS ?article) (GROUP_CONCAT(DISTINCT ?cl_; separator=", ") AS ?countryLabel) WHERE {
  ?item ${country ? 'wdt:P31/wdt:P279?' : 'wdt:P31'} wd:${cls}; wdt:P625 ?coord_; wikibase:sitelinks ?links.
  ${country ? `?item wdt:P17 wd:${country}.` : ''}
  FILTER(?links > ${country ? 2 : 40})
  OPTIONAL { ?item wdt:P2044 ?ele_. }
  OPTIONAL { ?item wdt:P18 ?image_. }
  OPTIONAL { ?item wdt:P856 ?website_. }
  OPTIONAL { ?item wdt:P17 ?ctry. ?ctry rdfs:label ?cl_. FILTER(LANG(?cl_) = "${l}") }
  ${label('lbl', 'rdfs:label', `"${l}"`)}
  ${label('en', 'rdfs:label', '"en"')}
  ${label('orig', 'rdfs:label', '"mul"')}
  ${label('desc', 'schema:description', `"${l}"`)}
  OPTIONAL { ?article_ schema:about ?item; schema:isPartOf <https://${l}.wikipedia.org/>. }
} GROUP BY ?item ?links ORDER BY DESC(?links) LIMIT ${lim} OFFSET ${off}`;
  const data = await upstream(`${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(sparql)}`, { headers: { accept: 'application/sparql-results+json' } }, 70_000);
  const seen = new Set();
  const items = [];
  for (const b of data.results.bindings) {
    const id = b.item.value.split('/').pop();
    if (seen.has(id)) continue; // dedupe (multiple coords/images)
    const m = b.coord.value.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
    if (!m) continue;
    const lon = +m[1], lat = +m[2];
    if (!validLonLat(lon, lat)) continue;
    seen.add(id);
    items.push({
      id, name: b.itemLabel?.value ?? b.enLabel?.value ?? id, originalName: b.origLabel?.value ?? null, lon, lat,
      elevation: b.ele ? Math.round(+b.ele.value) : null, country: b.countryLabel?.value ?? null,
      description: b.desc?.value ?? null, image: b.image?.value ?? null, website: b.website?.value ?? null,
      article: b.article?.value ?? null, category, source: `https://www.wikidata.org/wiki/${id}`,
    });
  }
  const out = { provider: 'wikidata', attribution: 'Wikidata (CC0); images from Wikimedia Commons (see file page for licence)', fetchedAt: new Date().toISOString(), items };
  atlasCache.set(key, out);
  return out;
}

export async function status() {
  const check = async (name, fn) => { const t = Date.now(); try { await fn(); return { name, ok: true, ms: Date.now() - t }; } catch (e) { return { name, ok: false, error: e.code || String(e) }; } };
  return Promise.all([
    check('valhalla', () => upstream(`${VALHALLA}/status`, {}, 8000)),
    check('nominatim', () => upstream(`${NOMINATIM}/status?format=json`, {}, 8000)),
    check('open-meteo', () => upstream(`${OPEN_METEO}?latitude=47&longitude=11&current=temperature_2m`, {}, 8000)),
  ]);
}
