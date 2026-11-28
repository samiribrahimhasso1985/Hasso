/**
 * Orchestrates the cinematic simulation: wires the timeline, playback clock and controllers.
 * Independent of React — the UI only calls methods and subscribes to throttled snapshots.
 */
import type { MapEngine } from '../map/MapEngine';
import type { Route } from '../route/types';
import { JourneyTimeline, type TimelineState } from './JourneyTimeline';
import { PlaybackController } from './PlaybackController';
import { ArrivalSceneController, CinematicCameraController, HikerMovementController, RouteAnimationController, type CameraMode } from './controllers';

export interface JourneyFrameInfo { state: TimelineState; position: [number, number]; elevation: number | null; remainingM: number }

export class CinematicJourney {
  readonly timeline: JourneyTimeline;
  readonly playback: PlaybackController;
  readonly routeAnim: RouteAnimationController;
  readonly hiker: HikerMovementController;
  readonly camera: CinematicCameraController;
  readonly arrival: ArrivalSceneController;
  private lastT = 0;
  private revealing: boolean | null = null;
  private lastFrameAt = performance.now();
  private infoSubs = new Set<(i: JourneyFrameInfo) => void>();
  info!: JourneyFrameInfo;

  constructor(private engine: MapEngine, readonly route: Route, opts: { reducedMotion?: boolean; onArrive?: (a: boolean) => void } = {}) {
    this.timeline = new JourneyTimeline({ totalDistanceM: route.cum.at(-1)!, waypointDistancesM: route.waypointDistances });
    this.playback = new PlaybackController(this.timeline.duration);
    this.routeAnim = new RouteAnimationController(engine, route);
    this.hiker = new HikerMovementController(engine, route);
    this.camera = new CinematicCameraController(engine, route, opts.reducedMotion);
    this.arrival = new ArrivalSceneController(this.hiker, opts.onArrive ?? (() => {}));
    engine.setRouteVisibility(false);
    this.playback.onFrame((t) => this.render(t));
    this.render(0, true);
  }

  /** Render the frame for animation time t. Also used by the video exporter. */
  render(t: number, jump = false, dtOverride?: number) {
    const now = performance.now();
    const scrub = jump || Math.abs(t - this.lastT) > 1.0; // large jump = scrub
    const dt = dtOverride ?? (scrub ? 1 : Math.max(0.001, Math.min(0.1, (now - this.lastFrameAt) / 1000)));
    this.lastFrameAt = now; this.lastT = t;
    const st = this.timeline.at(t);
    const total = this.route.cum.at(-1)!;
    // Reveal scene: the line is drawn progressively from start to destination along the real geometry.
    // Hike: the planned path is shown faintly and the bright progress line trails the hiker.
    const revealing = st.phase === 'opening' || st.phase === 'reveal';
    const drawn = st.phase === 'opening' ? 0 : st.phase === 'reveal' ? st.reveal * total : st.distance;
    if (revealing !== this.revealing) { this.revealing = revealing; this.routeAnim.showFullRoute(!revealing); }
    this.routeAnim.drawTo(drawn);
    scrub ? this.hiker.reset(st.distance) : this.hiker.update(st.distance);
    this.camera.frame(st, this.hiker, dt);
    this.arrival.frame(st);
    this.info = { state: st, position: this.hiker.position, elevation: this.hiker.elevation, remainingM: Math.max(0, total - st.distance) };
    this.infoSubs.forEach((f) => f(this.info));
  }

  onInfo(fn: (i: JourneyFrameInfo) => void) { this.infoSubs.add(fn); return () => this.infoSubs.delete(fn); }
  setCameraMode(m: CameraMode) { this.camera.setMode(m); this.render(this.playback.time, false, 0.016); }

  destroy() {
    this.playback.destroy();
    this.infoSubs.clear();
    this.hiker.destroy();
    this.routeAnim.clear();
    this.engine.setRouteVisibility(true);
    this.camera.setMode('free'); // restore user interaction
  }
}
