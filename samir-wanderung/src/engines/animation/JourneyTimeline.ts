/**
 * JourneyTimeline — deterministic mapping from animation time (s) to the journey state.
 * The same t always yields the same frame, which makes scrubbing and video export exact.
 *
 * Scenes: opening (orbit at start) → reveal (route drawn, camera flyover) → hike (hiker moves,
 * line drawn behind it, short holds at intermediate waypoints) → arrival (orbit at destination).
 */
export type ScenePhase = 'opening' | 'reveal' | 'hike' | 'waypoint' | 'arrival';

export interface TimelineConfig {
  totalDistanceM: number;
  waypointDistancesM: number[]; // includes start (0) and end
  /** Seconds of hiking animation per km at 1x. */
  secondsPerKm?: number;
  opening?: number;
  reveal?: number;
  waypointHold?: number;
  arrival?: number;
}

export interface Segment { phase: ScenePhase; t0: number; t1: number; d0: number; d1: number; waypointIndex?: number }

export interface TimelineState {
  t: number;
  phase: ScenePhase;
  /** Hiker distance along route (m). */
  distance: number;
  /** Fraction of the route line revealed (0..1) during the reveal scene; 1 afterwards. */
  reveal: number;
  /** 0..1 progress within the current scene. */
  sceneProgress: number;
  waypointIndex?: number;
  done: boolean;
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export class JourneyTimeline {
  readonly segments: Segment[] = [];
  readonly duration: number;

  constructor(cfg: TimelineConfig) {
    const km = cfg.totalDistanceM / 1000;
    // Long routes speed up so a 40 km route does not take 10 minutes at 1x.
    const spk = cfg.secondsPerKm ?? Math.max(2.5, Math.min(10, 60 / Math.max(km, 0.5)));
    const opening = cfg.opening ?? 4, reveal = cfg.reveal ?? 5, hold = cfg.waypointHold ?? 2.5, arrival = cfg.arrival ?? 6;
    let t = 0;
    this.segments.push({ phase: 'opening', t0: t, t1: (t += opening), d0: 0, d1: 0 });
    this.segments.push({ phase: 'reveal', t0: t, t1: (t += reveal), d0: 0, d1: 0 });
    const stops = cfg.waypointDistancesM.slice(1, -1).filter((d) => d > 0 && d < cfg.totalDistanceM).sort((a, b) => a - b);
    const marks = [0, ...stops, cfg.totalDistanceM];
    for (let i = 1; i < marks.length; i++) {
      const d0 = marks[i - 1], d1 = marks[i];
      this.segments.push({ phase: 'hike', t0: t, t1: (t += Math.max(1, ((d1 - d0) / 1000) * spk)), d0, d1 });
      if (i < marks.length - 1) this.segments.push({ phase: 'waypoint', t0: t, t1: (t += hold), d0: d1, d1, waypointIndex: i });
    }
    this.segments.push({ phase: 'arrival', t0: t, t1: (t += arrival), d0: cfg.totalDistanceM, d1: cfg.totalDistanceM });
    this.duration = t;
  }

  at(tIn: number): TimelineState {
    const t = Math.max(0, Math.min(this.duration, tIn));
    // Binary search: segments are sorted by t0.
    let lo = 0, hi = this.segments.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.segments[mid].t0 <= t) lo = mid; else hi = mid - 1; }
    const s = this.segments[lo];
    const p = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) : 1;
    // Hiking speed is linear in distance within a segment (synchronised with real distance),
    // with gentle easing only at the very start and end of the whole journey.
    let distance = s.d0 + (s.d1 - s.d0) * p;
    if (s.phase === 'hike') {
      const first = this.segments.find((x) => x.phase === 'hike')!;
      const last = [...this.segments].reverse().find((x) => x.phase === 'hike')!;
      if (s === first && s === last) distance = s.d0 + (s.d1 - s.d0) * smoothEnds(p);
      else if (s === first) distance = s.d0 + (s.d1 - s.d0) * smoothStart(p);
      else if (s === last) distance = s.d0 + (s.d1 - s.d0) * smoothEnd(p);
    }
    return {
      t, phase: s.phase, distance,
      reveal: s.phase === 'opening' ? 0 : s.phase === 'reveal' ? easeInOut(p) : 1,
      sceneProgress: p, waypointIndex: s.waypointIndex, done: t >= this.duration,
    };
  }

  /** Animation time at which the hiker reaches distance d (for scrubbing by distance). */
  timeForDistance(d: number): number {
    for (const s of this.segments) if (s.phase === 'hike' && d <= s.d1) return s.t0 + ((d - s.d0) / Math.max(1e-9, s.d1 - s.d0)) * (s.t1 - s.t0);
    return this.duration;
  }
}

// Ease only the first/last 10 % so speed stays proportional to distance elsewhere.
const smoothStart = (p: number) => (p < 0.1 ? (p * p) / 0.2 : p - 0.05) / 0.95;
const smoothEnd = (p: number) => 1 - smoothStart(1 - p);
const smoothEnds = (p: number) => (p < 0.5 ? smoothStart(p * 2) / 2 : 0.5 + smoothEnd((p - 0.5) * 2) / 2);
