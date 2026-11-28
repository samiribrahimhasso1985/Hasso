/** Pure geographic helpers. Coordinates are [lon, lat] (GeoJSON order). */
export type LngLat = [number, number];

const R = 6371008.8; // mean Earth radius in metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearing(a: LngLat, b: LngLat): number {
  const φ1 = toRad(a[1]), φ2 = toRad(b[1]), Δλ = toRad(b[0] - a[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Decode a Google-style encoded polyline. Valhalla uses precision 6. */
export function decodePolyline(str: string, precision = 6): LngLat[] {
  const factor = 10 ** precision;
  const out: LngLat[] = [];
  let lat = 0, lon = 0, i = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let result = 0, shift = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta; else lon += delta;
    }
    out.push([lon / factor, lat / factor]);
  }
  return out;
}

export function encodePolyline(coords: LngLat[], precision = 6): string {
  const factor = 10 ** precision;
  let out = '', pLat = 0, pLon = 0;
  const enc = (v: number) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lon, lat] of coords) {
    const la = Math.round(lat * factor), lo = Math.round(lon * factor);
    out += enc(la - pLat) + enc(lo - pLon);
    pLat = la; pLon = lo;
  }
  return out;
}

/** Cumulative distance in metres for each vertex. */
export function cumulativeDistances(coords: LngLat[]): number[] {
  const d = [0];
  for (let i = 1; i < coords.length; i++) d.push(d[i - 1] + haversine(coords[i - 1], coords[i]));
  return d;
}

export interface PointAlong { coord: LngLat; index: number; bearing: number }

/**
 * Point at distance `dist` along the line, by binary search over the cumulative
 * distances, then linear interpolation inside the segment. O(log n).
 */
export function pointAlong(coords: LngLat[], cum: number[], dist: number): PointAlong {
  const n = coords.length;
  if (n === 0) throw new Error('empty line');
  if (n === 1 || dist <= 0) return { coord: coords[0], index: 0, bearing: n > 1 ? bearing(coords[0], coords[1]) : 0 };
  const total = cum[n - 1];
  if (dist >= total) return { coord: coords[n - 1], index: n - 2, bearing: bearing(coords[n - 2], coords[n - 1]) };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= dist) lo = mid; else hi = mid; }
  const seg = cum[hi] - cum[lo];
  const t = seg > 0 ? (dist - cum[lo]) / seg : 0;
  const a = coords[lo], b = coords[hi];
  return { coord: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], index: lo, bearing: bearing(a, b) };
}

/** Sub-line from the start to `dist` metres (used for progressive route drawing). */
export function sliceTo(coords: LngLat[], cum: number[], dist: number): LngLat[] {
  if (dist <= 0) return [coords[0]];
  const p = pointAlong(coords, cum, dist);
  return [...coords.slice(0, p.index + 1), p.coord];
}

/** Resample a line at roughly even spacing, keeping at most `max` points. */
export function resample(coords: LngLat[], max: number): { coords: LngLat[]; dists: number[] } {
  const cum = cumulativeDistances(coords);
  const total = cum[cum.length - 1];
  if (coords.length <= max) return { coords, dists: cum };
  const out: LngLat[] = [], dists: number[] = [];
  for (let i = 0; i < max; i++) {
    const d = (total * i) / (max - 1);
    out.push(pointAlong(coords, cum, d).coord);
    dists.push(d);
  }
  return { coords: out, dists };
}

/** Distance in metres from point p to the polyline, plus the along-distance of the closest point. */
export function distanceToLine(p: LngLat, coords: LngLat[], cum: number[]): { distance: number; along: number } {
  let best = Infinity, along = 0;
  const kx = Math.cos(toRad(p[1])) * 111320, ky = 110540; // local equirectangular metres/degree
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = (coords[i][0] - p[0]) * kx, ay = (coords[i][1] - p[1]) * ky;
    const bx = (coords[i + 1][0] - p[0]) * kx, by = (coords[i + 1][1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(cx, cy);
    if (d < best) { best = d; along = cum[i] + t * (cum[i + 1] - cum[i]); }
  }
  return { distance: best, along };
}

export function bbox(coords: LngLat[]): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of coords) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  return [w, s, e, n];
}

/** Parse "lat, lon" or "lat lon" strings (decimal degrees). Returns [lon, lat] or null. */
export function parseCoordinates(input: string): LngLat | null {
  const m = input.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [lon, lat];
}

export function isValidLngLat(c: unknown): c is LngLat {
  return Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
    && Math.abs(c[0] as number) <= 180 && Math.abs(c[1] as number) <= 90;
}
