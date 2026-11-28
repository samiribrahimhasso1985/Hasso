// @vitest-environment node
/**
 * Live provider tests against real services (run with network; skipped when SKIP_NETWORK=1).
 * They verify that routes/elevation/geocoding come from the real backends.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain ESM server module
import * as P from '../server/providers.mjs';
import { decodePolyline, cumulativeDistances, encodePolyline, resample } from '../src/engines/route/geo';
import { COUNTRIES } from '../src/engines/atlas/countries';

const net = process.env.SKIP_NETWORK ? describe.skip : describe;

net('real providers', () => {
  it('Nominatim finds Zugspitze with its real coordinates', async () => {
    const r = await P.geocode({ q: 'Zugspitze', limit: 3, lang: 'en' });
    const z = r.results.find((x: { type: string }) => x.type === 'peak');
    expect(z).toBeTruthy(); expect(z.lat).toBeCloseTo(47.421, 2); expect(z.lon).toBeCloseTo(10.986, 2);
  }, 30_000);

  it('Valhalla: real hiking route Eibsee → Zugspitze with alternatives and elevation', async () => {
    const res = await P.route({ locations: [{ lon: 10.9708, lat: 47.4582 }, { lon: 10.9863, lat: 47.4212 }], costing: 'pedestrian', costing_options: { pedestrian: { max_hiking_difficulty: 6, use_hills: 1 } }, alternates: 2 });
    const coords = decodePolyline(res.trip.legs[0].shape, 6);
    const km = cumulativeDistances(coords).at(-1)! / 1000;
    expect(coords.length).toBeGreaterThan(50);
    expect(km).toBeGreaterThan(5); expect(km).toBeLessThan(30); // far longer than the 4.2 km straight line
    expect(Math.abs(km - res.trip.summary.length)).toBeLessThan(0.5);
    const h = await P.height({ polyline: encodePolyline(resample(coords, 100).coords, 6) });
    const known = h.heights.filter((x: number | null) => x != null);
    expect(Math.min(...known)).toBeLessThan(1100); // Eibsee ~973 m
    expect(Math.max(...known)).toBeGreaterThan(2700); // summit 2962 m
    const attr = await P.attributes({ polyline: encodePolyline(resample(coords, 500).coords, 6) });
    expect(attr.surfaces.length).toBeGreaterThan(0);
  }, 90_000);

  it('Valhalla: intermediate stop and round trip', async () => {
    const res = await P.route({ locations: [{ lon: 11.0952, lat: 47.4920 }, { lon: 11.1290, lat: 47.4760 }, { lon: 11.0952, lat: 47.4920 }], costing: 'pedestrian', costing_options: { pedestrian: {} } });
    expect(res.trip.legs).toHaveLength(2);
  }, 60_000);

  it('Valhalla: rejects non-pedestrian costing and invalid coordinates', async () => {
    await expect(P.route({ locations: [{ lon: 1, lat: 1 }, { lon: 2, lat: 2 }], costing: 'auto' })).rejects.toMatchObject({ code: 'only_pedestrian_costing' });
    await expect(P.route({ locations: [{ lon: 999, lat: 1 }, { lon: 2, lat: 2 }], costing: 'pedestrian' })).rejects.toMatchObject({ code: 'invalid_coordinates' });
  });

  it('Valhalla: an unroutable request surfaces as no_route (mid-Atlantic)', async () => {
    await expect(P.route({ locations: [{ lon: -30, lat: 30 }, { lon: -31, lat: 31 }], costing: 'pedestrian', costing_options: { pedestrian: {} } })).rejects.toMatchObject({ code: expect.stringMatching(/no_route|provider_error/) });
  }, 60_000);

  it('Wikidata atlas returns real lakes in Germany with valid coordinates', async () => {
    const r = await P.atlas({ category: 'lake', country: 'Q183', lang: 'de', limit: 10 });
    expect(r.items.length).toBeGreaterThan(3);
    expect(r.items.map((x: { name: string }) => x.name)).toContain('Bodensee');
    for (const i of r.items) { expect(Math.abs(i.lat)).toBeLessThanOrEqual(90); expect(i.source).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/); }
  }, 90_000);

  it('Wikidata country IDs match their labels', async () => {
    const ids = COUNTRIES.map((c) => `wd:${c.q}`).join(' ');
    const q = `SELECT ?c ?l WHERE { VALUES ?c { ${ids} } ?c rdfs:label ?l. FILTER(LANG(?l)="en") }`;
    const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'SSBN-tests/0.1', accept: 'application/sparql-results+json' } }).then((x) => x.json());
    const labels = Object.fromEntries(r.results.bindings.map((b: { c: { value: string }; l: { value: string } }) => [b.c.value.split('/').pop(), b.l.value]));
    const aliases: Record<string, string[]> = { Q30: ['United States of America'], Q148: ["People's Republic of China"], Q884: ['South Korea'], Q213: ['Czech Republic', 'Czechia'], Q43: ['Turkey', 'Türkiye'], Q55: ['Netherlands', 'Kingdom of the Netherlands'] };
    for (const c of COUNTRIES) expect([c.name, ...(aliases[c.q] ?? [])], `${c.q} → ${labels[c.q]}`).toContain(labels[c.q]);
  }, 90_000);
});
