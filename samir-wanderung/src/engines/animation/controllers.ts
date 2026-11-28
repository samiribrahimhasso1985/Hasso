/**
 * Animation controllers operating on the MapEngine. All geometry comes from the real
 * route returned by the routing engine (route.coords / route.cum) — never a straight line.
 */
import maplibregl from 'maplibre-gl';
import type { MapEngine } from '../map/MapEngine';
import type { Route } from '../route/types';
import { pointAlong, sliceTo, type LngLat, bearing as bearingOf } from '../route/geo';
import { elevationAt } from '../route/RouteEngine';
import type { TimelineState } from './JourneyTimeline';

/** Progressive route drawing. Uses a simplified copy for very long routes to keep frames cheap. */
export class RouteAnimationController {
  private coords: LngLat[];
  private cum: number[];
  constructor(private engine: MapEngine, route: Route) {
    this.coords = route.coords; this.cum = route.cum;
  }
  /** Draw from start to `distance` metres along the route. */
  drawTo(distance: number) { this.engine.setProgressLine(sliceTo(this.coords, this.cum, distance)); }
  showFullRoute(visible: boolean) { this.engine.setRouteVisibility(visible); }
  clear() { this.engine.setProgressLine([]); }
}

/** Hiker marker positioned by interpolation along the real route geometry, terrain-aware. */
export class HikerMovementController {
  readonly marker: maplibregl.Marker;
  private el: HTMLDivElement;
  private smoothedBearing: number | null = null;
  position: LngLat;
  elevation: number | null = null;
  heading = 0;

  constructor(engine: MapEngine, private route: Route) {
    this.el = document.createElement('div');
    this.el.className = 'sw-hiker';
    this.el.innerHTML = '<div class="sw-hiker-pulse"></div><div class="sw-hiker-dot"></div>';
    this.position = route.coords[0];
    this.marker = new maplibregl.Marker({ element: this.el, pitchAlignment: 'map', rotationAlignment: 'map' }).setLngLat(this.position).addTo(engine.map);
  }

  update(distance: number) {
    const p = pointAlong(this.route.coords, this.route.cum, distance);
    // Look ahead 60 m for heading so tiny zig-zags do not jitter the marker/camera.
    const ahead = pointAlong(this.route.coords, this.route.cum, Math.min(this.route.cum.at(-1)!, distance + 60)).coord;
    const target = ahead[0] === p.coord[0] && ahead[1] === p.coord[1] ? p.bearing : bearingOf(p.coord, ahead);
    this.smoothedBearing = this.smoothedBearing === null ? target : lerpAngle(this.smoothedBearing, target, 0.15);
    this.heading = this.smoothedBearing;
    this.position = p.coord;
    // Elevation from the route's DEM profile; MapLibre terrain also clamps the marker to the ground.
    this.elevation = elevationAt(this.route, distance);
    this.marker.setLngLat(p.coord);
  }

  /** Jump without smoothing (scrubbing). */
  reset(distance: number) { this.smoothedBearing = null; this.update(distance); }
  setArrived(on: boolean) { this.el.classList.toggle('sw-hiker-arrived', on); }
  destroy() { this.marker.remove(); }
}

export type CameraMode = 'follow' | 'aerial' | 'free';

export interface CameraParams { distance: number; pitch: number }

/** Cinematic camera: follow, aerial (drone) and free modes with exponential smoothing. */
export class CinematicCameraController {
  mode: CameraMode = 'follow';
  params: CameraParams = { distance: 1, pitch: 62 };
  private cur: { center: LngLat; zoom: number; bearing: number; pitch: number } | null = null;
  private orbit = 0;

  constructor(private engine: MapEngine, private route: Route, private reducedMotion = false) {}

  setMode(m: CameraMode) {
    this.mode = m;
    const map = this.engine.map;
    const free = m === 'free';
    for (const h of [map.dragPan, map.dragRotate, map.scrollZoom, map.touchZoomRotate, map.touchPitch, map.keyboard, map.doubleClickZoom])
      free ? h.enable() : h.disable();
    this.cur = null; // re-sync from the current camera to avoid a jump
  }

  /** Called every frame with timeline state + hiker info. */
  frame(st: TimelineState, hiker: { position: LngLat; heading: number }, dt: number) {
    if (this.mode === 'free') return;
    const map = this.engine.map;
    if (!this.cur) this.cur = { center: [map.getCenter().lng, map.getCenter().lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
    const target = this.target(st, hiker, dt);
    // Frame-rate independent smoothing; reduced motion snaps more and avoids orbiting.
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * (st.phase === 'reveal' ? 1.4 : 3));
    this.cur = {
      center: [lerp(this.cur.center[0], target.center[0], k), lerp(this.cur.center[1], target.center[1], k)],
      zoom: lerp(this.cur.zoom, target.zoom, k),
      bearing: lerpAngle(this.cur.bearing, target.bearing, k),
      pitch: lerp(this.cur.pitch, target.pitch, k),
    };
    map.jumpTo({ center: this.cur.center, zoom: this.cur.zoom, bearing: this.cur.bearing, pitch: this.cur.pitch });
  }

  private target(st: TimelineState, hiker: { position: LngLat; heading: number }, dt: number) {
    const totalKm = this.route.distanceKm;
    const overviewZoom = Math.max(10, Math.min(14.5, 15.2 - Math.log2(Math.max(0.5, totalKm))));
    const start = this.route.coords[0], end = this.route.coords.at(-1)!;
    if (!this.reducedMotion) this.orbit += dt * (st.phase === 'arrival' || st.phase === 'opening' ? 12 : st.phase === 'waypoint' ? 8 : 0);
    switch (st.phase) {
      case 'opening': return { center: start, zoom: 14.5, bearing: hiker.heading - 40 + this.orbit, pitch: 65 };
      case 'reveal': {
        // Flyover: camera travels along the route as it is drawn, pulled back to overview zoom.
        const p = pointAlong(this.route.coords, this.route.cum, st.reveal * this.route.cum.at(-1)!);
        return { center: p.coord, zoom: overviewZoom, bearing: p.bearing * 0.3 + hiker.heading * 0.7, pitch: 55 };
      }
      case 'waypoint': return { center: hiker.position, zoom: 15, bearing: hiker.heading + this.orbit, pitch: 68 };
      case 'arrival': return { center: end, zoom: 14.2, bearing: hiker.heading + this.orbit, pitch: 62 };
      case 'hike':
      default:
        if (this.mode === 'aerial') {
          // Drone: higher, slightly ahead of the hiker, slowly drifting bearing to reveal valleys.
          const ahead = pointAlong(this.route.coords, this.route.cum, Math.min(this.route.cum.at(-1)!, st.distance + 400)).coord;
          return { center: [lerp(hiker.position[0], ahead[0], 0.5), lerp(hiker.position[1], ahead[1], 0.5)] as LngLat, zoom: 13.2 - (this.params.distance - 1) * 1.2, bearing: hiker.heading + 25 * Math.sin(st.t / 12), pitch: Math.min(70, this.params.pitch - 8) };
        }
        return { center: hiker.position, zoom: 15.6 - (this.params.distance - 1) * 1.5, bearing: hiker.heading, pitch: this.params.pitch };
    }
  }
}

/** Arrival scene: marks arrival, triggers UI overlay once per playthrough. */
export class ArrivalSceneController {
  private shown = false;
  constructor(private hiker: HikerMovementController, private onArrive: (arrived: boolean) => void) {}
  frame(st: TimelineState) {
    const arrived = st.phase === 'arrival';
    if (arrived !== this.shown) { this.shown = arrived; this.hiker.setArrived(arrived); this.onArrive(arrived); }
  }
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function lerpAngle(a: number, b: number, k: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * k;
}
