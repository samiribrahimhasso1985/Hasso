/** GPX 1.1 export / import. */
import type { TrackPoint } from '../route/types';
import type { LngLat } from '../route/geo';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export function toGPX(opts: { name: string; track?: TrackPoint[]; route?: LngLat[]; elevations?: (number | null)[]; waypoints?: { name: string; coord: LngLat }[] }): string {
  const parts = [`<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="SAMIR WANDERUNG" xmlns="http://www.topografix.com/GPX/1/1">`,
    `<metadata><name>${esc(opts.name)}</name><time>${new Date().toISOString()}</time></metadata>`];
  for (const w of opts.waypoints ?? []) parts.push(`<wpt lat="${w.coord[1]}" lon="${w.coord[0]}"><name>${esc(w.name)}</name></wpt>`);
  if (opts.route?.length) {
    parts.push(`<rte><name>${esc(opts.name)} (planned)</name>`);
    opts.route.forEach((c, i) => { const e = opts.elevations?.[i]; parts.push(`<rtept lat="${c[1]}" lon="${c[0]}">${e != null ? `<ele>${e.toFixed(1)}</ele>` : ''}</rtept>`); });
    parts.push(`</rte>`);
  }
  if (opts.track?.length) {
    parts.push(`<trk><name>${esc(opts.name)}</name><trkseg>`);
    for (const p of opts.track) parts.push(`<trkpt lat="${p.lat}" lon="${p.lon}">${p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : ''}<time>${new Date(p.t).toISOString()}</time></trkpt>`);
    parts.push(`</trkseg></trk>`);
  }
  parts.push(`</gpx>`);
  return parts.join('\n');
}

export interface ParsedGPX { name: string | null; track: TrackPoint[]; route: LngLat[]; waypoints: { name: string; coord: LngLat }[] }

export function parseGPX(xml: string): ParsedGPX {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('invalid_gpx');
  const num = (el: Element, a: string) => { const v = parseFloat(el.getAttribute(a) ?? ''); if (!Number.isFinite(v)) throw new Error('invalid_gpx'); return v; };
  const track: TrackPoint[] = [];
  doc.querySelectorAll('trkpt').forEach((el) => {
    const ele = el.querySelector('ele')?.textContent; const time = el.querySelector('time')?.textContent;
    track.push({ lat: num(el, 'lat'), lon: num(el, 'lon'), alt: ele ? parseFloat(ele) : null, t: time ? Date.parse(time) : 0, acc: NaN, speed: null });
  });
  const route: LngLat[] = [];
  doc.querySelectorAll('rtept').forEach((el) => route.push([num(el, 'lon'), num(el, 'lat')]));
  const waypoints = [...doc.querySelectorAll('wpt')].map((el) => ({ name: el.querySelector('name')?.textContent ?? '', coord: [num(el, 'lon'), num(el, 'lat')] as LngLat }));
  return { name: doc.querySelector('metadata > name, trk > name, rte > name')?.textContent ?? null, track, route, waypoints };
}

export function download(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
