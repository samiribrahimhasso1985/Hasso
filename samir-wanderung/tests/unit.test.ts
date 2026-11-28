import { describe, it, expect } from 'vitest';
import { haversine, decodePolyline, encodePolyline, cumulativeDistances, pointAlong, sliceTo, distanceToLine, parseCoordinates, resample, type LngLat } from '../src/engines/route/geo';
import { elevationStats, hikingTimeHours, estimateDifficulty } from '../src/engines/route/stats';
import { costingFor, routeLocations } from '../src/engines/route/RouteEngine';
import { JourneyTimeline } from '../src/engines/animation/JourneyTimeline';
import { PlaybackController } from '../src/engines/animation/PlaybackController';
import { toGPX, parseGPX } from '../src/engines/gps/gpx';
import { GPSEngine } from '../src/engines/gps/GPSEngine';
import { tilesInBbox, lonToTileX, latToTileY, estimateRegion } from '../src/engines/offline/OfflineEngine';
import { packingList } from '../src/engines/ai/packing';
import { emergencyFor, emergencySmsBody } from '../src/engines/safety/emergency';
import { translate } from '../src/core/i18n';
import { en } from '../src/core/i18n/en';
import { de } from '../src/core/i18n/de';
import { ar } from '../src/core/i18n/ar';
import { ku } from '../src/core/i18n/ku';
import { sceneAt, defaultProject, projectDuration } from '../src/engines/video/VideoProject';

describe('geo', () => {
  it('haversine: Zugspitze ↔ Eibsee ≈ 4.2 km', () => {
    const d = haversine([10.98630, 47.42122], [10.97084, 47.45825]);
    expect(d).toBeGreaterThan(4000); expect(d).toBeLessThan(4400);
  });
  it('polyline6 round-trips', () => {
    const pts: LngLat[] = [[10.990700, 47.470600], [10.985300, 47.421100], [-122.4194, 37.7749]];
    const dec = decodePolyline(encodePolyline(pts, 6), 6);
    dec.forEach((p, i) => { expect(p[0]).toBeCloseTo(pts[i][0], 5); expect(p[1]).toBeCloseTo(pts[i][1], 5); });
  });
  it('decodes the canonical Google example (precision 5)', () => {
    const d = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(d[0]).toEqual([-120.2, 38.5]); expect(d[2][0]).toBeCloseTo(-126.453, 3);
  });
  it('pointAlong interpolates along the polyline, not a straight line', () => {
    const line: LngLat[] = [[0, 0], [0, 1], [1, 1]]; // L-shape
    const cum = cumulativeDistances(line);
    const mid = pointAlong(line, cum, cum[2] / 2);
    expect(mid.coord[0]).toBeCloseTo(0, 6); // still on the first leg's corner, not the diagonal
    expect(mid.coord[1]).toBeCloseTo(1, 2);
    const q = pointAlong(line, cum, cum[1] * 0.5);
    expect(q.coord[0]).toBe(0); expect(q.coord[1]).toBeCloseTo(0.5, 6);
    expect(pointAlong(line, cum, 1e12).coord).toEqual([1, 1]);
  });
  it('sliceTo ends exactly at the interpolated point', () => {
    const line: LngLat[] = [[0, 0], [0, 1], [1, 1]];
    const cum = cumulativeDistances(line);
    const s = sliceTo(line, cum, cum[1] * 1.5);
    expect(s.length).toBe(3); expect(s[2][1]).toBeCloseTo(1, 6); expect(s[2][0]).toBeGreaterThan(0.4);
  });
  it('distanceToLine', () => {
    const line: LngLat[] = [[11, 47], [11.01, 47]];
    const r = distanceToLine([11.005, 47.0009], line, cumulativeDistances(line));
    expect(r.distance).toBeGreaterThan(90); expect(r.distance).toBeLessThan(110);
    expect(r.along).toBeGreaterThan(370); expect(r.along).toBeLessThan(390);
  });
  it('parseCoordinates', () => {
    expect(parseCoordinates('47.4212, 10.9863')).toEqual([10.9863, 47.4212]);
    expect(parseCoordinates('-33.9 18.4')).toEqual([18.4, -33.9]);
    expect(parseCoordinates('95, 10')).toBeNull();
    expect(parseCoordinates('Zugspitze')).toBeNull();
  });
  it('resample keeps end points', () => {
    const line: LngLat[] = Array.from({ length: 1000 }, (_, i) => [11 + i * 1e-4, 47] as LngLat);
    const r = resample(line, 50);
    expect(r.coords.length).toBe(50); expect(r.coords[49][0]).toBeCloseTo(line[999][0], 8);
  });
});

describe('route stats', () => {
  it('DIN 33466: 12 km, 600 m up, 600 m down', () => {
    // h = 3, v = 2 + 1.2 = 3.2 → 3.2 + 1.5 = 4.7 h
    expect(hikingTimeHours(12, 600, 600)).toBeCloseTo(4.7, 6);
  });
  it('elevationStats with hysteresis ignores noise and keeps unknowns unknown', () => {
    const s = elevationStats([{ d: 0, h: 100 }, { d: 1, h: 101 }, { d: 2, h: 99 }, { d: 3, h: 150 }, { d: 4, h: null }, { d: 5, h: 120 }]);
    expect(s.ascent).toBe(50); expect(s.descent).toBe(30); expect(s.min).toBe(99); expect(s.max).toBe(150); expect(s.coverage).toBeCloseTo(5 / 6);
    expect(elevationStats([{ d: 0, h: null }]).min).toBeNull();
  });
  it('difficulty estimate', () => {
    expect(estimateDifficulty({ distanceKm: 4, ascentM: 50 })).toBe('easy');
    expect(estimateDifficulty({ distanceKm: 18, ascentM: 1200 })).toBe('hard');
    expect(estimateDifficulty({ distanceKm: 5, ascentM: 200, maxSac: 4 })).toBe('alpine');
  });
  it('costing options are real Valhalla pedestrian options', () => {
    expect(costingFor('easier')).toMatchObject({ max_hiking_difficulty: 1 });
    expect(costingFor('mountain')).toMatchObject({ max_hiking_difficulty: 6 });
    expect(costingFor('shortest')).toMatchObject({ shortest: true });
  });
  it('round trip appends the start', () => {
    const p = (c: LngLat) => ({ name: 'x', coord: c, origin: 'map' as const });
    expect(routeLocations({ points: [p([1, 1]), p([2, 2])], type: 'standard', roundTrip: true })).toEqual([[1, 1], [2, 2], [1, 1]]);
  });
});

describe('animation', () => {
  const tl = new JourneyTimeline({ totalDistanceM: 10000, waypointDistancesM: [0, 4000, 10000] });
  it('timeline is deterministic and monotonic in distance', () => {
    let last = -1;
    for (let t = 0; t <= tl.duration; t += 0.25) { const s = tl.at(t); expect(s.distance).toBeGreaterThanOrEqual(last - 1e-9); last = s.distance; expect(tl.at(t)).toEqual(s); }
    expect(tl.at(tl.duration).distance).toBe(10000);
    expect(tl.at(tl.duration).phase).toBe('arrival');
  });
  it('has opening, reveal, hike, waypoint and arrival scenes', () => {
    expect(tl.segments.map((s) => s.phase)).toEqual(['opening', 'reveal', 'hike', 'waypoint', 'hike', 'arrival']);
  });
  it('movement is proportional to real distance in the middle of a segment', () => {
    const h = tl.segments[4]; // 4 km → 10 km
    const at = (f: number) => tl.at(h.t0 + (h.t1 - h.t0) * f).distance;
    // Constant speed in the middle: equal time windows cover equal distance.
    expect(at(0.5) - at(0.3)).toBeCloseTo(at(0.7) - at(0.5), 6);
  });
  it('timeForDistance inverts at()', () => {
    const t = tl.timeForDistance(7000);
    expect(tl.at(t).distance).toBeCloseTo(7000, -2);
  });
  it('playback: play/pause/seek/speed with a fake clock', () => {
    const q: FrameRequestCallback[] = []; let now = 0;
    const realNow = performance.now; (performance as { now: () => number }).now = () => now;
    const p = new PlaybackController(20, 10, (cb) => { q.push(cb); return q.length; }, () => {});
    const frames: number[] = []; p.onFrame((t) => frames.push(t));
    p.play(); now += 50; q.shift()!(now); now += 50; q.shift()!(now);
    expect(p.time).toBeCloseTo(0.1, 6);
    p.setSpeed(4); now += 50; q.shift()!(now); expect(p.time).toBeCloseTo(0.3, 6);
    p.pause(); expect(p.playing).toBe(false);
    p.seek(19.99); p.play(); now += 100; q.shift()!(now); expect(p.time).toBe(20); expect(p.playing).toBe(false);
    p.restart(); expect(p.time).toBe(0);
    p.destroy(); (performance as { now: () => number }).now = realNow;
  });
});

describe('GPS & GPX', () => {
  it('GPX export/import round trip', () => {
    const track = [{ t: Date.parse('2026-07-01T08:00:00Z'), lon: 10.99, lat: 47.47, alt: 1000, acc: 5, speed: 1 }, { t: Date.parse('2026-07-01T08:01:00Z'), lon: 10.991, lat: 47.471, alt: 1010, acc: 5, speed: 1 }];
    const xml = toGPX({ name: 'Test <&>', track, route: [[10.99, 47.47], [10.98, 47.42]], waypoints: [{ name: 'Hut', coord: [10.985, 47.43] }] });
    const g = parseGPX(xml);
    expect(g.name).toBe('Test <&>'); expect(g.track).toHaveLength(2); expect(g.track[1].alt).toBe(1010); expect(g.track[0].t).toBe(track[0].t);
    expect(g.route).toEqual([[10.99, 47.47], [10.98, 47.42]]); expect(g.waypoints[0].name).toBe('Hut');
    expect(() => parseGPX('<gpx><trkpt lat="x"')).toThrow();
  });
  it('GPSEngine records real fixes, filters jitter & poor accuracy, pauses', () => {
    let cb: PositionCallback | null = null;
    const geo = { watchPosition: (s: PositionCallback) => { cb = s; return 1; }, clearWatch: () => { cb = null; }, getCurrentPosition: () => {} } as unknown as Geolocation;
    const g = new GPSEngine({ highAccuracy: true, minDistance: 5, maxAccuracy: 50 }, geo);
    const fix = (lon: number, lat: number, acc = 5, t = 0) => cb!({ coords: { longitude: lon, latitude: lat, accuracy: acc, altitude: 1000, speed: 1, altitudeAccuracy: null, heading: null }, timestamp: t } as unknown as GeolocationPosition);
    g.start();
    fix(11, 47, 5, 1000); fix(11.00001, 47, 5, 2000); // 0.76 m jitter → ignored
    fix(11.001, 47, 5, 3000); // ~76 m
    fix(11.002, 47, 200, 4000); // poor accuracy → shown, not recorded
    expect(g.state.track).toHaveLength(2); expect(g.state.position?.acc).toBe(200);
    expect(g.state.distanceM).toBeGreaterThan(70); expect(g.state.distanceM).toBeLessThan(80);
    g.pause(); expect(g.state.status).toBe('paused'); expect(cb).toBeNull();
    g.resume(); fix(11.003, 47, 5, 5000); expect(g.state.track).toHaveLength(3);
    expect(g.stop()).toHaveLength(3);
  });
  it('GPSEngine reports unavailable without geolocation', () => {
    const g = new GPSEngine(undefined, undefined); g.start(); expect(g.state.status).toBe('unavailable');
  });
});

describe('offline tiles', () => {
  it('tile math matches the slippy-map convention', () => {
    expect(lonToTileX(0, 1)).toBe(1); expect(latToTileY(0.0001, 1)).toBe(0);
    // z12 indices, cross-checked with an independent Python computation of the same formula
    expect(lonToTileX(10.99, 12)).toBe(2173); expect(latToTileY(47.4212, 12)).toBe(1433);
  });
  it('counts tiles and flags large regions', () => {
    expect(tilesInBbox([10.9, 47.4, 11.0, 47.5], 12, 12).length).toBeGreaterThan(0);
    expect(estimateRegion([5, 45, 15, 50], 6, 14).tooBig).toBe(true);
    expect(estimateRegion([10.95, 47.40, 11.02, 47.45], 9, 14).tooBig).toBe(false);
  });
});

describe('safety & packing', () => {
  it('emergency numbers only for verified entries', () => {
    expect(emergencyFor('DE')?.primary).toBe('112');
    expect(emergencyFor('at')?.extra?.[0].number).toBe('140');
    expect(emergencyFor('us')?.primary).toBe('911');
    expect(emergencyFor('xx')).toBeNull(); expect(emergencyFor(null)).toBeNull();
    expect(emergencySmsBody({ lon: 10.98, lat: 47.42, acc: 8, alt: 2900, time: 0 })).toContain('47.42000, 10.98000');
  });
  it('packing list reacts to forecast inputs', () => {
    const base = { hours: 5, maxEle: 2900, minTemp: 2, maxPrecipProb: 60, maxGust: 55, snow: true, month: 6, northern: true, needs: { dog: true } };
    const items = packingList(base).map((x) => x.item).join('|');
    expect(items).toMatch(/Rain jacket/); expect(items).toMatch(/Warm layer/); expect(items).toMatch(/Windproof/); expect(items).toMatch(/Traction/); expect(items).toMatch(/Dog/);
    expect(packingList({ ...base, maxPrecipProb: 0, minTemp: 20, maxGust: 10, snow: false, needs: {} }).map((x) => x.item).join('|')).not.toMatch(/Rain|Warm|Windproof|Traction/);
  });
});

describe('i18n', () => {
  it('falls back to English and covers core keys in every language', () => {
    const core = ['nav.home', 'nav.planner', 'nav.cinematic', 'nav.live', 'home.plan', 'cine.label', 'planner.calculate', 'safety.noRescue'] as const;
    for (const d of [de, ar, ku]) for (const k of core) expect(d[k], k).toBeTruthy();
    expect(translate('ku', 'studio.bitrate')).toBe(en['studio.bitrate']);
    expect(translate('ar', 'cine.label')).toBe('محاكاة سينمائية');
  });
  it('no unknown keys in translations', () => {
    for (const d of [de, ar, ku]) for (const k of Object.keys(d)) expect(k in en, k).toBe(true);
  });
});

describe('video project', () => {
  it('sceneAt and duration', () => {
    const p = defaultProject('j', 'T', 'D');
    expect(projectDuration(p)).toBe(32);
    expect(sceneAt(p, 0)?.scene.type).toBe('title');
    expect(sceneAt(p, 4)?.scene.type).toBe('worldZoom');
    expect(sceneAt(p, 31.9)?.scene.type).toBe('end');
  });
});
