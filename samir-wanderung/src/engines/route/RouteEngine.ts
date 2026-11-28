/**
 * Route engine: talks to the SAMIR WANDERUNG server, which proxies Valhalla
 * (pedestrian costing on OpenStreetMap data). No route is ever invented here:
 * if the backend fails, an error is thrown and shown to the user.
 */
import { cumulativeDistances, decodePolyline, encodePolyline, pointAlong, resample, distanceToLine, type LngLat } from './geo';
import { elevationStats, estimateDifficulty, hikingTimeHours } from './stats';
import type { Place, Route, RouteRequest, RouteType } from './types';
import { api, ApiError } from '../../core/api';

export const ROUTE_TYPES: RouteType[] = ['standard', 'shortest', 'easier', 'mountain'];

/** Map our route types onto real Valhalla pedestrian costing options. */
export function costingFor(type: RouteType): Record<string, unknown> {
  const base = { walkway_factor: 0.7, sidewalk_factor: 1.0, use_tracks: 0.8, use_living_streets: 0.6, service_penalty: 20, use_ferry: 0 };
  switch (type) {
    case 'standard': return { ...base, max_hiking_difficulty: 3, use_hills: 0.5 };
    case 'shortest': return { ...base, max_hiking_difficulty: 3, shortest: true };
    case 'easier': return { ...base, max_hiking_difficulty: 1, use_hills: 0.05 };
    case 'mountain': return { ...base, max_hiking_difficulty: 6, use_hills: 1.0 };
  }
}

interface ValhallaLeg { shape: string; summary: { length: number; time: number }; maneuvers: { instruction: string; length: number; begin_shape_index: number }[] }
interface ValhallaTrip { legs: ValhallaLeg[]; summary: { length: number; time: number } }
interface ValhallaResponse { trip: ValhallaTrip; alternates?: { trip: ValhallaTrip }[] }

export function routeLocations(req: RouteRequest): LngLat[] {
  const pts = req.points.map((p) => p.coord);
  if (req.roundTrip && pts.length >= 2) pts.push(pts[0]);
  return pts;
}

let seq = 0;

async function enrich(trip: ValhallaTrip, label: Route['label'], signal?: AbortSignal): Promise<Route> {
  const coords: LngLat[] = [];
  const waypointDistances: number[] = [0];
  const maneuvers: Route['maneuvers'] = [];
  for (const leg of trip.legs) {
    const legCoords = decodePolyline(leg.shape, 6);
    const offset = coords.length === 0 ? 0 : coords.length - 1;
    for (const m of leg.maneuvers) maneuvers.push({ instruction: m.instruction, lengthKm: m.length, beginIndex: m.begin_shape_index + offset });
    coords.push(...(coords.length ? legCoords.slice(1) : legCoords));
    waypointDistances.push(cumulativeDistances(coords).at(-1)!);
  }
  const cum = cumulativeDistances(coords);
  const distanceKm = cum[cum.length - 1] / 1000;

  // Elevation from the server (Valhalla /height over a resampled line).
  const sample = resample(coords, 400);
  let elevation: Route['elevation'] = sample.dists.map((d) => ({ d, h: null }));
  try {
    const res = await api<{ heights: (number | null)[] }>('/api/height', { method: 'POST', body: { polyline: encodePolyline(sample.coords, 6) }, signal });
    elevation = sample.dists.map((d, i) => ({ d, h: res.heights[i] ?? null }));
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    // Unknown elevation is kept as null and labelled in the UI — never invented.
  }
  const st = elevationStats(elevation);

  // Surface + SAC scale via Valhalla trace_attributes.
  let surfaces: Route['surfaces'] = [];
  let maxSac: number | null = null;
  try {
    const tr = await api<{ surfaces: { surface: string; km: number }[]; maxSac: number | null }>('/api/attributes', {
      method: 'POST', body: { polyline: encodePolyline(resample(coords, 1500).coords, 6) }, signal,
    });
    surfaces = tr.surfaces; maxSac = tr.maxSac;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
  }

  return {
    id: `r${Date.now().toString(36)}${(seq++).toString(36)}`,
    label, coords, cum, distanceKm,
    valhallaTimeS: trip.summary.time,
    elevation, ascent: st.ascent, descent: st.descent, minEle: st.min, maxEle: st.max, elevationCoverage: st.coverage,
    hikingHours: hikingTimeHours(distanceKm, st.ascent, st.descent),
    difficulty: estimateDifficulty({ distanceKm, ascentM: st.ascent, maxSac }),
    maxSac, surfaces, waypointDistances, maneuvers,
    provider: 'valhalla', computedAt: new Date().toISOString(),
  };
}

export async function calculateRoutes(req: RouteRequest, signal?: AbortSignal): Promise<Route[]> {
  const locs = routeLocations(req);
  if (locs.length < 2) throw new ApiError(400, 'need_points');
  const body = {
    locations: locs.map(([lon, lat], i) => ({ lon, lat, type: i === 0 || i === locs.length - 1 ? 'break' : 'through' })),
    costing: 'pedestrian',
    costing_options: { pedestrian: costingFor(req.type) },
    // Valhalla only computes alternates for 2-location requests.
    alternates: locs.length === 2 ? 2 : 0,
    units: 'kilometers',
  };
  // Intermediate stops must be "break" so each leg ends at the stop.
  body.locations.forEach((l) => (l.type = 'break'));
  const res = await api<ValhallaResponse>('/api/route', { method: 'POST', body, signal });
  const trips = [res.trip, ...(res.alternates ?? []).map((a) => a.trip)];
  const routes: Route[] = [];
  for (let i = 0; i < trips.length; i++) routes.push(await enrich(trips[i], i === 0 ? 'main' : 'alternative', signal));
  return routes;
}

/** Reroute from a live position to the remaining part of a planned route's destination. */
export async function rerouteFrom(position: LngLat, destination: Place, type: RouteType, signal?: AbortSignal): Promise<Route> {
  const routes = await calculateRoutes({ points: [{ name: 'GPS', coord: position, origin: 'gps' }, destination], type, roundTrip: false }, signal);
  return routes[0];
}

export function elevationAt(route: Route, dist: number): number | null {
  const e = route.elevation;
  if (!e.length) return null;
  let lo = 0, hi = e.length - 1;
  if (dist <= e[0].d) return e[0].h;
  if (dist >= e[hi].d) return e[hi].h;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (e[m].d <= dist) lo = m; else hi = m; }
  const a = e[lo], b = e[hi];
  if (a.h == null || b.h == null) return a.h ?? b.h;
  const t = (dist - a.d) / (b.d - a.d || 1);
  return a.h + (b.h - a.h) * t;
}

export { pointAlong, distanceToLine };
