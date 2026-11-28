/**
 * Offline map engine. Downloads tiles for a bounding box into the Cache API so the
 * service worker (and MapLibre's fetches) can serve them without network.
 * Only providers whose policy allows offline caching are downloaded:
 *   - OpenFreeMap vector tiles (+ style, glyphs, sprites)
 *   - AWS Terrain Tiles (Terrarium DEM)
 * Esri satellite imagery and OSMF raster tiles are never bulk-downloaded.
 */
import { MAP_STYLE_URL, TERRAIN_TILES } from '../../config/providers';
import { Regions, uid, type OfflineRegion } from '../storage/db';

export const OFFLINE_CACHE = 'sw-offline-tiles-v1';
export const MAX_TILES = 4000;

export function lonToTileX(lon: number, z: number) { return Math.floor(((lon + 180) / 360) * 2 ** z); }
export function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

export function tilesInBbox(bbox: [number, number, number, number], minZ: number, maxZ: number): { z: number; x: number; y: number }[] {
  const out: { z: number; x: number; y: number }[] = [];
  const [w, s, e, n] = bbox;
  for (let z = minZ; z <= maxZ; z++) {
    const x0 = lonToTileX(w, z), x1 = lonToTileX(e, z), y0 = latToTileY(n, z), y1 = latToTileY(s, z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z, x, y });
  }
  return out;
}

/** Resolve the vector tile URL template plus static style assets from the style JSON. */
async function styleAssets(): Promise<{ vectorTemplates: string[]; vectorMaxZoom: number; staticUrls: string[] }> {
  const style = await (await fetch(MAP_STYLE_URL)).json();
  const staticUrls = [MAP_STYLE_URL];
  const vectorTemplates: string[] = []; let vectorMaxZoom = 14;
  for (const src of Object.values(style.sources) as { type: string; url?: string; tiles?: string[] }[]) {
    if (src.type !== 'vector') continue;
    if (src.url) {
      staticUrls.push(src.url);
      const tj = await (await fetch(src.url)).json();
      vectorTemplates.push(...tj.tiles); vectorMaxZoom = tj.maxzoom ?? 14;
    } else if (src.tiles) vectorTemplates.push(...src.tiles);
  }
  if (style.sprite) for (const sfx of ['.json', '.png', '@2x.json', '@2x.png']) staticUrls.push(`${style.sprite}${sfx}`);
  if (style.glyphs) for (const font of ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic']) for (const range of ['0-255', '256-511', '1536-1791', '1792-2047', '8192-8447'])
    staticUrls.push(style.glyphs.replace('{fontstack}', encodeURIComponent(font)).replace('{range}', range));
  return { vectorTemplates, vectorMaxZoom, staticUrls };
}

export interface DownloadProgress { done: number; total: number; bytes: number; failed: number }

export function estimateRegion(bbox: [number, number, number, number], minZ: number, maxZ: number) {
  const vec = tilesInBbox(bbox, minZ, Math.min(maxZ, 14)).length;
  const dem = tilesInBbox(bbox, minZ, Math.min(maxZ, 13)).length;
  return { tiles: vec + dem, tooBig: vec + dem > MAX_TILES };
}

export async function downloadRegion(opts: {
  name: string; bbox: [number, number, number, number]; minZoom: number; maxZoom: number;
  signal: AbortSignal; onProgress: (p: DownloadProgress) => void; resumeId?: string;
}): Promise<OfflineRegion> {
  if (!('caches' in window)) throw new Error('cache_api_unavailable');
  const cache = await caches.open(OFFLINE_CACHE);
  const { vectorTemplates, vectorMaxZoom, staticUrls } = await styleAssets();
  const urls = new Set<string>(staticUrls);
  for (const t of tilesInBbox(opts.bbox, opts.minZoom, Math.min(opts.maxZoom, vectorMaxZoom)))
    for (const tpl of vectorTemplates) urls.add(tpl.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
  for (const t of tilesInBbox(opts.bbox, opts.minZoom, Math.min(opts.maxZoom, 13)))
    urls.add(TERRAIN_TILES.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
  if (urls.size > MAX_TILES + 100) throw new Error('region_too_large');

  const region: OfflineRegion = {
    id: opts.resumeId ?? uid('reg'), name: opts.name, bbox: opts.bbox, minZoom: opts.minZoom, maxZoom: opts.maxZoom,
    tileUrls: [...urls], bytes: 0, createdAt: new Date().toISOString(), complete: false, failed: 0,
  };
  await Regions.put(region);

  const list = [...urls]; let done = 0, bytes = 0, failed = 0;
  const worker = async () => {
    while (list.length) {
      if (opts.signal.aborted) return;
      const u = list.shift()!;
      try {
        const hit = await cache.match(u);
        if (hit) { bytes += Number(hit.headers.get('content-length') ?? 0) || (await hit.clone().arrayBuffer()).byteLength; }
        else {
          const r = await fetch(u, { signal: opts.signal });
          if (!r.ok && r.status !== 204) throw new Error(String(r.status));
          const buf = await r.clone().arrayBuffer();
          bytes += buf.byteLength;
          await cache.put(u, r);
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError' || opts.signal.aborted) return;
        if ((e as DOMException).name === 'QuotaExceededError') throw e;
        failed++;
      }
      done++;
      if (done % 10 === 0 || !list.length) opts.onProgress({ done, total: urls.size, bytes, failed });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  region.bytes = bytes; region.failed = failed; region.complete = !opts.signal.aborted && done === urls.size;
  await Regions.put(region); // saved even if interrupted so it can be resumed
  return region;
}

/** Re-checks every URL of a region against the cache. */
export async function checkIntegrity(r: OfflineRegion): Promise<{ present: number; missing: number }> {
  const cache = await caches.open(OFFLINE_CACHE);
  let present = 0;
  for (const u of r.tileUrls) if (await cache.match(u)) present++;
  return { present, missing: r.tileUrls.length - present };
}

/**
 * Deletes a region's tiles that no other region needs. Journeys, tracks and
 * saved routes are separate IndexedDB stores and are never touched here.
 */
export async function deleteRegion(r: OfflineRegion) {
  const others = (await Regions.list()).filter((x) => x.id !== r.id);
  const keep = new Set(others.flatMap((x) => x.tileUrls));
  const cache = await caches.open(OFFLINE_CACHE);
  for (const u of r.tileUrls) if (!keep.has(u)) await cache.delete(u);
  await Regions.remove(r.id);
}

/**
 * MapLibre's fetches go through the page, so we install a fetch interceptor via the
 * service worker (see sw registration). As a fallback when no SW is active, MapLibre's
 * transformRequest cannot read Cache API synchronously — so the PWA service worker
 * route below is the actual offline path.
 */
export const OFFLINE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com'];
