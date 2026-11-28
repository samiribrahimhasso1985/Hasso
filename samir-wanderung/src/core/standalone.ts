/**
 * Standalone mode (Android app without a configured server): the same provider code the server
 * uses runs on the device. Requests go directly to the public providers (Capacitor's native HTTP
 * avoids CORS). Community and AI features need a server and report `server_required`.
 */
import { ApiError } from './api';
// @ts-expect-error — shared plain-JS module
import * as P from '../../server/providers.mjs';
import seed from '../../server/data/atlas-seed.json';

let seeded = false;

export async function handleLocally<T>(method: string, path: string, body: unknown): Promise<T> {
  if (!seeded) { P.setAtlasSeed(seed); seeded = true; }
  const url = new URL(path, 'http://local');
  const q = Object.fromEntries(url.searchParams) as Record<string, string>;
  const n = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  const key = `${method} ${url.pathname}`;
  try {
    switch (key) {
      case 'GET /api/geocode': return await P.geocode({ q: q.q, limit: n(q.limit), lang: q.lang });
      case 'GET /api/reverse': return await P.reverse({ lon: n(q.lon), lat: n(q.lat), lang: q.lang });
      case 'POST /api/route': return await P.route(body);
      case 'POST /api/height': return await P.height(body);
      case 'POST /api/attributes': return await P.attributes(body);
      case 'GET /api/weather': return await P.weather({ lon: n(q.lon), lat: n(q.lat) });
      case 'GET /api/trails': return await P.trails({ lon: n(q.lon), lat: n(q.lat), radiusKm: n(q.radiusKm) });
      case 'GET /api/peaks': return await P.peaks({ west: n(q.west), south: n(q.south), east: n(q.east), north: n(q.north) });
      case 'GET /api/atlas': return await P.atlas({ category: q.category, country: q.country || undefined, lang: q.lang, offset: n(q.offset), limit: n(q.limit) });
      case 'GET /api/status': return { providers: await P.status(), ai: { configured: false, model: 'server required' }, standalone: true } as T;
      case 'GET /api/me': return { user: null } as T;
      default: throw new ApiError(503, 'server_required');
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const err = e as { status?: number; code?: string; detail?: unknown };
    throw new ApiError(err.status ?? 500, err.code ?? 'error', err.detail);
  }
}
