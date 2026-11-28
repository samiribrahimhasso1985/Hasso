// Runs real worldwide search queries through the server's geocoder and writes docs/GLOBAL_SEARCH_TESTS.md
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE_URL || 'http://localhost:8787';
const cases = [
  ['Country', 'Germany', 'en'], ['Country', 'Iraq', 'en'], ['Country', 'Nepal', 'en'],
  ['City', 'Erbil', 'en'], ['City', 'Zürich', 'de'], ['City', 'Cusco', 'en'],
  ['Mountain', 'Matterhorn', 'en'], ['Mountain', 'Kilimanjaro', 'en'], ['Mountain', 'Halgurd', 'en'], ['Mountain (alias)', 'Monte Cervino', 'en'],
  ['Lake', 'Lake Titicaca', 'en'], ['Lake', 'Königssee', 'de'],
  ['Waterfall', 'Gullfoss', 'en'], ['Waterfall', 'Iguazu Falls', 'en'],
  ['Forest', 'Black Forest', 'en'], ['National park', 'Yosemite National Park', 'en'], ['National park', 'Nationalpark Berchtesgaden', 'de'],
  ['Hiking trail', 'Rennsteig', 'de'], ['Hiking trail', 'Tour du Mont Blanc', 'en'],
  ['Arabic query', 'جبل حلكورد', 'ar'], ['Arabic query', 'أربيل', 'ar'], ['Kurdish query', 'Hewlêr', 'ku'], ['German query', 'Zugspitze', 'de'],
];
const rows = [];
for (const [cat, q, lang] of cases) {
  const t = Date.now();
  try {
    const r = await fetch(`${BASE}/api/geocode?q=${encodeURIComponent(q)}&lang=${lang}&limit=3`).then((x) => x.json());
    const f = r.results?.[0];
    rows.push(`| ${cat} | ${q} | ${lang} | ${f ? `${f.name} (${f.category}/${f.type})` : r.error ?? 'no result'} | ${f ? `${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}` : '—'} | ${f?.country ?? '—'} | ${Date.now() - t} ms |`);
  } catch (e) { rows.push(`| ${cat} | ${q} | ${lang} | ERROR ${e.message} | | | |`); }
}
const coord = ['47.4212, 10.9863', '-13.1631, -72.5450', '36.6366, 44.8846'];
const coordRows = coord.map((c) => `| \`${c}\` | parsed client-side by \`parseCoordinates\` (unit-tested) → [lon, lat] |`);
writeFileSync('docs/GLOBAL_SEARCH_TESTS.md', `# Global Search Tests

Real queries executed on ${new Date().toISOString()} against Nominatim through the SAMIR WANDERUNG server
(\`/api/geocode\`, results cached 24 h, max 1 upstream request/s). Results are reported exactly as returned.

| Category | Query | UI language | Top result | Coordinates (lat, lon) | Country | Time |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Coordinate search
| Input | Handling |
|---|---|
${coordRows.join('\n')}

## Other search surfaces
- **Nature Atlas** category + country filters (Wikidata) — see DATA_COVERAGE_REPORT.md for tested countries.
- **Hiking trails near a destination** — OSM route relations via Overpass (\`/api/trails\`).
- **Mountain Explorer** — named OSM peaks in the current map view (\`/api/peaks\`).
- **Recent searches / saved destinations** — stored locally (IndexedDB).

## Limitations
- Name search relies on Nominatim's OSM index; transliterations and Kurdish names work only where OSM has \`name:*\` tags.
- Nominatim is not a full-text trail database: long-distance trails are found only when mapped as named OSM relations.
- Search-as-you-type is debounced (450 ms) to respect the Nominatim usage policy.
`);
console.log(rows.join('\n'));
