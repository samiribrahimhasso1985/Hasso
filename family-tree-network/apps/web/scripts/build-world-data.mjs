// Builds the land network for EZIDINET WORLD from Natural Earth (public domain, via the world-atlas package):
// evenly spread points on a sphere (Fibonacci lattice), kept where there is land, each linked to its nearest
// neighbours. Output: public/world/land-high.json and land-low.json  →  { points: [lat, lon, …], edges: [i, j, …] }
// Run: node apps/web/scripts/build-world-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-50m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);

function build(samples, maxNeighbours, maxAngleDeg) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = ((((golden * i * 180) / Math.PI) % 360) + 540) % 360 - 180;
    if (lat < -60) continue; // leave out Antarctica: keeps the globe light and readable
    if (geoContains(land, [lon, lat])) pts.push([lat, lon]);
  }
  const xyz = pts.map(([la, lo]) => {
    const a = (la * Math.PI) / 180, b = (lo * Math.PI) / 180;
    return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)];
  });
  const minDot = Math.cos((maxAngleDeg * Math.PI) / 180);
  const seen = new Set();
  const edges = [];
  for (let i = 0; i < xyz.length; i++) {
    const near = [];
    for (let j = 0; j < xyz.length; j++) {
      if (i === j) continue;
      const d = xyz[i][0] * xyz[j][0] + xyz[i][1] * xyz[j][1] + xyz[i][2] * xyz[j][2];
      if (d > minDot) near.push([d, j]);
    }
    near.sort((a, b) => b[0] - a[0]);
    for (const [, j] of near.slice(0, maxNeighbours)) {
      const k = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (!seen.has(k)) { seen.add(k); edges.push(i, j); }
    }
  }
  return { points: pts.flatMap(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]), edges };
}

for (const [name, samples, n, ang] of [['high', 18000, 3, 3.2], ['low', 7000, 2, 5]]) {
  const out = build(samples, n, ang);
  writeFileSync(join(here, '..', 'public', 'world', `land-${name}.json`), JSON.stringify(out));
  console.log(`land-${name}: ${out.points.length / 2} points, ${out.edges.length / 2} links`);
}
