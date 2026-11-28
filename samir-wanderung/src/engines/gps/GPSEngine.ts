/**
 * GPSEngine — real device positioning via the W3C Geolocation API (navigator.geolocation).
 * No positions are ever simulated. Recording state survives pause/resume and
 * points are persisted locally in batches so a crash loses at most a few seconds.
 */
import type { TrackPoint } from '../route/types';
import { haversine, type LngLat } from '../route/geo';

export type GPSStatus = 'idle' | 'requesting' | 'tracking' | 'paused' | 'denied' | 'unavailable' | 'error';

export interface GPSSettings {
  highAccuracy: boolean;
  /** Minimum movement (m) before a new point is recorded — battery/storage saver. */
  minDistance: number;
  /** Points worse than this accuracy (m) are shown but not recorded. */
  maxAccuracy: number;
}

export const DEFAULT_GPS: GPSSettings = { highAccuracy: true, minDistance: 5, maxAccuracy: 50 };
export const BATTERY_SAVER_GPS: GPSSettings = { highAccuracy: false, minDistance: 20, maxAccuracy: 100 };

export interface GPSState {
  status: GPSStatus;
  position: TrackPoint | null;
  track: TrackPoint[];
  distanceM: number;
  startedAt: number | null;
  movingMs: number;
  error?: string;
}

type Sub = (s: GPSState) => void;

export class GPSEngine {
  private watchId: number | null = null;
  private subs = new Set<Sub>();
  private settings: GPSSettings;
  private lastMoveT: number | null = null;
  state: GPSState = { status: 'idle', position: null, track: [], distanceM: 0, startedAt: null, movingMs: 0 };
  onPersist?: (points: TrackPoint[]) => void;
  private pending: TrackPoint[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(settings: GPSSettings = DEFAULT_GPS, private geo: Geolocation | undefined = typeof navigator !== 'undefined' ? navigator.geolocation : undefined) {
    this.settings = settings;
  }

  static available(): boolean { return typeof navigator !== 'undefined' && 'geolocation' in navigator; }

  subscribe(fn: Sub): () => void { this.subs.add(fn); fn(this.state); return () => this.subs.delete(fn); }
  private emit(patch: Partial<GPSState>) { this.state = { ...this.state, ...patch }; this.subs.forEach((s) => s(this.state)); }

  setSettings(s: GPSSettings) {
    this.settings = s;
    if (this.watchId !== null) { this.stopWatch(); this.startWatch(); }
  }

  /** One-off position, e.g. "use my location" as a start point. */
  static async currentPosition(timeout = 15000): Promise<LngLat> {
    if (!GPSEngine.available()) throw new Error('unavailable');
    return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
      (p) => res([p.coords.longitude, p.coords.latitude]),
      (e) => rej(new Error(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'error')),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    ));
  }

  start(resumeTrack?: TrackPoint[]) {
    if (!this.geo) { this.emit({ status: 'unavailable' }); return; }
    const track = resumeTrack ?? [];
    let d = 0; for (let i = 1; i < track.length; i++) d += haversine([track[i - 1].lon, track[i - 1].lat], [track[i].lon, track[i].lat]);
    this.emit({ status: 'requesting', track, distanceM: d, startedAt: Date.now(), movingMs: 0, error: undefined });
    this.startWatch();
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  pause() { if (this.state.status === 'tracking' || this.state.status === 'requesting') { this.stopWatch(); this.flush(); this.lastMoveT = null; this.emit({ status: 'paused' }); } }
  resume() { if (this.state.status === 'paused') { this.emit({ status: 'requesting' }); this.startWatch(); } }

  stop(): TrackPoint[] {
    this.stopWatch(); this.flush();
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    const t = this.state.track;
    this.emit({ status: 'idle' });
    return t;
  }

  private startWatch() {
    this.watchId = this.geo!.watchPosition(
      (p) => this.handle(p),
      (e) => {
        if (e.code === 1) { this.stopWatch(); this.emit({ status: 'denied', error: 'denied' }); }
        else this.emit({ error: e.code === 3 ? 'timeout' : 'position_unavailable' }); // keep watching; signal may return
      },
      { enableHighAccuracy: this.settings.highAccuracy, maximumAge: 2000, timeout: 30000 },
    );
  }

  private stopWatch() { if (this.watchId !== null) { this.geo?.clearWatch(this.watchId); this.watchId = null; } }

  /** Exposed for tests: feeds a real GeolocationPosition-shaped object. */
  handle(p: Pick<GeolocationPosition, 'coords' | 'timestamp'>) {
    const pt: TrackPoint = { t: p.timestamp, lon: p.coords.longitude, lat: p.coords.latitude, alt: p.coords.altitude, acc: p.coords.accuracy, speed: p.coords.speed };
    const patch: Partial<GPSState> = { position: pt, status: 'tracking', error: undefined };
    if (pt.acc <= this.settings.maxAccuracy) {
      const last = this.state.track.at(-1);
      const step = last ? haversine([last.lon, last.lat], [pt.lon, pt.lat]) : Infinity;
      // Ignore jitter smaller than the reported accuracy or the min-distance setting.
      if (!last || step >= Math.max(this.settings.minDistance, pt.acc * 0.5)) {
        patch.track = [...this.state.track, pt];
        if (last) {
          patch.distanceM = this.state.distanceM + step;
          if (this.lastMoveT && pt.t - this.lastMoveT < 120_000) patch.movingMs = this.state.movingMs + (pt.t - this.lastMoveT);
        }
        this.lastMoveT = pt.t;
        this.pending.push(pt);
      }
    }
    this.emit(patch);
  }

  private flush() { if (this.pending.length) { this.onPersist?.(this.pending); this.pending = []; } }
}
