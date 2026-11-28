// Builds the country layer for EZIDINET WORLD: every country of the world (Natural Earth 1:50m via world-atlas,
// public domain) with its name in English, German, Arabic and Kurmanji (i18n-iso-countries), a focus point,
// outline rings for drawing/highlighting, and a 0.5° lookup grid so a tap on the globe finds the country.
// Output: public/world/countries.json
// Run: node apps/web/scripts/build-world-countries.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import iso from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const LANGS = ['en', 'de', 'ar', 'ku'];
for (const l of LANGS) iso.registerLocale(require(`i18n-iso-countries/langs/${l}.json`));

const load = (f) => { const t = JSON.parse(readFileSync(require.resolve(`world-atlas/${f}`), 'utf8')); return feature(t, t.objects.countries).features; };
const f50 = load('countries-50m.json');
const f110 = load('countries-110m.json');
const r2 = (v) => Math.round(v * 100) / 100;

// Outline rings as flat [lat, lon, lat, lon, …] arrays.
const ringsOf = (g) => {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.flatMap((p) => p.map((ring) => ring.flatMap(([lon, lat]) => [r2(lat), r2(lon)])));
};
// Focus point: centre of the largest polygon (France → mainland, USA → contiguous states).
const focusOf = (f) => {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return geoCentroid(f);
  let best = null, area = -1;
  for (const coords of g.coordinates) {
    const p = { type: 'Polygon', coordinates: coords };
    const a = geoArea(p);
    if (a > area) { area = a; best = p; }
  }
  return geoCentroid(best);
};

const countries = [];
const shapes = [];
for (const f of f50) {
  if (!f.geometry) continue;
  const numeric = f.id ? String(f.id).padStart(3, '0') : null;
  const a2 = numeric ? iso.numericToAlpha2(numeric) : undefined;
  const fallback = f.properties.name;
  const name = Object.fromEntries(LANGS.map((l) => [l, (a2 && iso.getName(a2, l)) || fallback]));
  const small = f110.find((x) => (numeric && String(x.id).padStart(3, '0') === numeric) || x.properties.name === fallback);
  const [lon, lat] = focusOf(f);
  countries.push({ code: a2 ?? `X${countries.length}`, name, lat: r2(lat), lon: r2(lon), rings: ringsOf((small ?? f).geometry) });
  shapes.push({ f, b: geoBounds(f) });
}

// Lookup grid: row 0 = latitude 90..89.5, column 0 = longitude -180..-179.5; value = country index + 1 (0 = sea).
const STEP = 0.5, ROWS = 180 / STEP, COLS = 360 / STEP;
const grid = new Uint16Array(ROWS * COLS);
const inBox = ([[w, s], [e, n]], lon, lat) => lat >= s && lat <= n && (w <= e ? lon >= w && lon <= e : lon >= w || lon <= e);
for (let r = 0; r < ROWS; r++) {
  const lat = 90 - (r + 0.5) * STEP;
  for (let c = 0; c < COLS; c++) {
    const lon = -180 + (c + 0.5) * STEP;
    for (let i = 0; i < shapes.length; i++) {
      if (inBox(shapes[i].b, lon, lat) && geoContains(shapes[i].f, [lon, lat])) { grid[r * COLS + c] = i + 1; break; }
    }
  }
}
// Very small countries (Monaco, Vatican, Luxembourg …) still get the cell under their focus point.
countries.forEach((k, i) => {
  const r = Math.min(ROWS - 1, Math.floor((90 - k.lat) / STEP));
  const c = Math.min(COLS - 1, Math.floor((k.lon + 180) / STEP));
  grid[r * COLS + c] = i + 1;
});
// Run-length encoding per row: [value, count, value, count, …].
const rows = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    const v = grid[r * COLS + c];
    if (row.length && row[row.length - 2] === v) row[row.length - 1]++;
    else row.push(v, 1);
  }
  rows.push(row);
}

const out = { source: 'Natural Earth 1:50m / 1:110m (public domain) via world-atlas 2.0.2; names: i18n-iso-countries', step: STEP, countries, rows };
writeFileSync(join(here, '..', 'public', 'world', 'countries.json'), JSON.stringify(out));
console.log(`countries: ${countries.length}, without ISO code: ${countries.filter((c) => c.code.startsWith('X')).map((c) => c.name.en).join(', ')}`);
