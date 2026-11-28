// Prefetch real Wikidata atlas results into server/data/atlas-seed.json so the first page of each
// category loads instantly. Every record keeps its Wikidata source URL and the fetch timestamp.
// Usage: NODE_USE_ENV_PROXY=1 node scripts/prefetch-atlas.mjs [lang ...]
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { atlas, atlasKey, ATLAS_CLASSES } from '../server/providers.mjs';
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['en', 'de', 'ar'];
const file = new URL('../server/data/atlas-seed.json', import.meta.url);
mkdirSync(new URL('../server/data/', import.meta.url), { recursive: true });
const out = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const jobs = langs.flatMap((l) => Object.keys(ATLAS_CLASSES).map((c) => [c, l]));
let i = 0;
async function worker() {
  while (i < jobs.length) {
    const [c, l] = jobs[i++]; const t = Date.now();
    for (let attempt = 0; attempt < 2; attempt++) {
      try { const r = await atlas({ category: c, lang: l, offset: 0, limit: 30 }); out[atlasKey(c, undefined, l, 0, 30)] = r; console.log('ok', c, l, r.items.length, Date.now() - t, 'ms'); break; }
      catch (e) { console.log('fail', c, l, e.code, attempt); }
    }
    writeFileSync(file, JSON.stringify(out));
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log('seed entries:', Object.keys(out).length);
