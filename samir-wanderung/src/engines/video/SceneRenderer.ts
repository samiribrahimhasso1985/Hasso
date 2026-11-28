/**
 * SceneRenderer — draws any project time t into a compositing canvas:
 * real MapLibre frame (DEM terrain + route layers) + hiker/markers projected from geo coords +
 * titles (RTL-aware), photos (Ken Burns), user clips (seeked HTMLVideoElement), stats, watermark.
 */
import type { MapEngine } from '../map/MapEngine';
import type { Route } from '../route/types';
import { CinematicJourney } from '../animation/CinematicJourney';
import { easeInOut } from '../animation/JourneyTimeline';
import { FORMATS, type Scene, type VideoProjectData } from './VideoProject';

export interface MediaMap { images: Map<string, HTMLImageElement>; videos: Map<string, HTMLVideoElement> }

const isRtl = (s: string) => /[֐-ࣿ]/.test(s);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function effectiveScenes(p: VideoProjectData): Scene[] {
  const out: Scene[] = [];
  if (p.branding.intro) out.push({ id: '__intro', type: 'title', duration: 2.5, text: 'SSBN', subtitle: 'EXPLORE THE WORLD. EXPERIENCE THE JOURNEY.', transition: 'fade' });
  out.push(...p.scenes);
  if (p.branding.endScreen) out.push({ id: '__end', type: 'end', duration: 3, text: p.title, transition: 'fade' });
  return out;
}
export const effectiveDuration = (p: VideoProjectData) => effectiveScenes(p).reduce((a, s) => a + s.duration, 0);

export class SceneRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private journey: CinematicJourney | null = null;
  readonly W: number; readonly H: number;

  constructor(private engine: MapEngine, private route: Route, private project: VideoProjectData, private media: MediaMap, scale = 1) {
    const f = FORMATS[project.format];
    this.W = Math.round(f.width * scale); this.H = Math.round(f.height * scale);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W; this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.journey = new CinematicJourney(engine, route, { reducedMotion: false });
    this.journey.hiker.marker.getElement().style.visibility = 'hidden'; // drawn on canvas instead
  }

  setProject(p: VideoProjectData) { this.project = p; }

  /** Draw frame at project time t. If `waitTiles`, wait for the map to finish loading tiles. */
  async draw(t: number, waitTiles: boolean, dt = 1 / 30) {
    const scenes = effectiveScenes(this.project);
    let acc = 0, idx = 0;
    while (idx < scenes.length - 1 && t >= acc + scenes[idx].duration) { acc += scenes[idx].duration; idx++; }
    const s = scenes[idx]; const local = Math.min(s.duration, t - acc); const p = s.duration ? local / s.duration : 1;
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = '#0b0f12'; ctx.fillRect(0, 0, W, H);

    if (s.type === 'worldZoom' || s.type === 'route') {
      await this.drawMap(s, p, waitTiles, dt);
    } else if (s.type === 'photo') this.drawPhoto(s, p);
    else if (s.type === 'clip') await this.drawClip(s, local);
    if (s.type === 'title' || s.type === 'end') this.drawTitle(s, p);
    if (s.type === 'route' && this.project.showStats) this.drawStats();
    if (s.type !== 'title' && s.text && s.type !== 'end' && s.text !== 'reveal') this.caption(s.text, p);
    if (this.project.branding.watermark && s.id !== '__intro') this.watermark();
    // Fade transitions in/out of each scene.
    if (s.transition === 'fade') {
      const f = Math.min(1, local / 0.5, (s.duration - local) / 0.5);
      if (f < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, f)})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  private async drawMap(s: Scene, p: number, waitTiles: boolean, dt: number) {
    const map = this.engine.map, j = this.journey!;
    if (s.type === 'worldZoom') {
      // Zoom from a whole-world view down to the start of the real route (Web Mercator, not a 3D globe).
      const start = this.route.coords[0]; const e = easeInOut(p);
      j.routeAnim.drawTo(0); j.routeAnim.showFullRoute(false);
      map.jumpTo({ center: [lerp(start[0] * 0.3, start[0], e), lerp(start[1] * 0.3, start[1], e)], zoom: lerp(1.6, 12.5, e), pitch: lerp(0, 55, e), bearing: lerp(0, -20, e) });
    } else {
      j.camera.setMode(s.camera === 'free' ? 'follow' : (s.camera ?? 'follow'));
      j.camera.params = { distance: s.cameraDistance ?? 1, pitch: s.cameraPitch ?? 62 };
      const tl = j.timeline, total = this.route.cum.at(-1)!;
      let t: number;
      if (s.text === 'reveal') { const r = tl.segments.find((x) => x.phase === 'reveal')!; const o = tl.segments[0]; t = lerp(o.t0, r.t1, p); }
      else t = tl.timeForDistance(lerp((s.from ?? 0) * total, (s.to ?? 1) * total, p));
      j.render(t, false, dt);
    }
    if (waitTiles) await new Promise<void>((res) => { const to = setTimeout(res, 4000); map.once('idle', () => { clearTimeout(to); res(); }); map.triggerRepaint(); });
    else await new Promise<void>((res) => { map.once('render', () => res()); map.triggerRepaint(); setTimeout(res, 50); });
    const src = map.getCanvas();
    this.ctx.drawImage(src, 0, 0, this.W, this.H);
    const sx = this.W / src.clientWidth, sy = this.H / src.clientHeight;
    // Markers (DOM in the live map) are drawn onto the frame at their projected positions.
    const dot = (c: [number, number], color: string, r: number, glow = false) => {
      const pt = map.project(c); const x = pt.x * sx, y = pt.y * sy;
      if (x < -50 || y < -50 || x > this.W + 50 || y > this.H + 50) return;
      const g = this.ctx;
      if (glow) { g.shadowColor = '#14d3c8'; g.shadowBlur = r * 3; }
      g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0; g.lineWidth = r * 0.35; g.strokeStyle = '#fff'; g.stroke();
    };
    const u = this.W / 1920;
    dot(this.route.coords[0], '#14d3c8', 10 * Math.max(u, 0.6));
    dot(this.route.coords.at(-1)!, '#38d9ff', 12 * Math.max(u, 0.6));
    if (s.type === 'route') dot(j.hiker.position, '#e9fffd', 11 * Math.max(u, 0.6), true);
  }

  private drawPhoto(s: Scene, p: number) {
    const img = s.mediaId ? this.media.images.get(s.mediaId) : undefined;
    if (!img) return this.missing(s.mediaName ?? 'photo');
    const scale = lerp(1.05, 1.18, p); // Ken Burns
    const r = Math.max(this.W / img.width, this.H / img.height) * scale;
    const w = img.width * r, h = img.height * r;
    this.ctx.drawImage(img, (this.W - w) / 2 + lerp(-20, 20, p), (this.H - h) / 2, w, h);
  }

  private async drawClip(s: Scene, local: number) {
    const v = s.mediaId ? this.media.videos.get(s.mediaId) : undefined;
    if (!v) return this.missing(s.mediaName ?? 'clip');
    const target = Math.min(Math.max(0, v.duration - 0.05), local);
    if (Math.abs(v.currentTime - target) > 0.01) await new Promise<void>((res) => { const to = setTimeout(res, 1500); v.onseeked = () => { clearTimeout(to); res(); }; v.currentTime = target; });
    const r = Math.max(this.W / v.videoWidth, this.H / v.videoHeight);
    this.ctx.drawImage(v, (this.W - v.videoWidth * r) / 2, (this.H - v.videoHeight * r) / 2, v.videoWidth * r, v.videoHeight * r);
  }

  private missing(name: string) {
    this.ctx.fillStyle = '#7f1d1d'; this.ctx.fillRect(0, 0, this.W, this.H);
    this.text(`Missing media: ${name}`, this.W / 2, this.H / 2, 40, '#fecaca');
  }

  private text(str: string, x: number, y: number, size: number, color: string, weight = 600, font = 'Space Grotesk, "Noto Sans Arabic", sans-serif') {
    const g = this.ctx; const u = Math.min(this.W, this.H) / 1080;
    g.font = `${weight} ${Math.round(size * u)}px ${isRtl(str) ? '"Noto Sans Arabic", sans-serif' : font}`;
    g.direction = isRtl(str) ? 'rtl' : 'ltr';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color;
    g.fillText(str, x, y, this.W * 0.9);
  }

  private drawTitle(s: Scene, p: number) {
    const g = this.ctx, W = this.W, H = this.H;
    if (s.type === 'title' || s.type === 'end') {
      const grd = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      grd.addColorStop(0, '#12303a'); grd.addColorStop(1, '#05080a'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    }
    const rise = (1 - easeInOut(Math.min(1, p * 2.5))) * 30;
    if (s.id === '__intro') {
      // Logo animation: line sweep + letter-spaced wordmark.
      g.strokeStyle = '#14d3c8'; g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.3, H * 0.6); g.lineTo(W * 0.3 + W * 0.4 * easeInOut(Math.min(1, p * 1.6)), H * 0.6); g.stroke();
    }
    this.text(s.text ?? '', W / 2, H * 0.45 + rise, s.id === '__intro' ? 84 : 72, '#ffffff', 700);
    if (s.subtitle) this.text(s.subtitle, W / 2, H * 0.55 + rise, 30, '#7ff3ea', 500);
    if (s.type === 'end' || s.id === '__end') {
      const r = this.route, pr = this.project;
      this.text(`${r.distanceKm.toFixed(1)} km · ↑ ${r.ascent} m · ${r.maxEle != null ? `▲ ${r.maxEle} m` : ''}`, W / 2, H * 0.58, 34, '#cbd5e1', 500);
      this.text([pr.destination, pr.country, pr.date].filter(Boolean).join(' · '), W / 2, H * 0.64, 26, '#94a3b8', 400);
      if (pr.branding.creditText) this.text(pr.branding.creditText, W / 2, H * 0.72, 24, '#94a3b8', 400);
      this.text('Map data © OpenStreetMap contributors · OpenFreeMap · Terrain Tiles (AWS) · Routing: Valhalla', W / 2, H * 0.92, 16, '#64748b', 400, 'Inter, sans-serif');
    }
  }

  private caption(str: string, p: number) {
    const g = this.ctx; const a = Math.min(1, p * 4, (1 - p) * 4);
    g.globalAlpha = Math.max(0, a); g.fillStyle = 'rgba(7,9,11,.55)'; g.fillRect(0, this.H * 0.82, this.W, this.H * 0.1);
    this.text(str, this.W / 2, this.H * 0.87, 40, '#fff'); g.globalAlpha = 1;
  }

  private drawStats() {
    const j = this.journey!, info = j.info; if (!info) return;
    const g = this.ctx, u = Math.min(this.W, this.H) / 1080;
    g.fillStyle = 'rgba(11,15,18,.6)'; g.fillRect(24 * u, 24 * u, 380 * u, 120 * u);
    g.font = `600 ${Math.round(26 * u)}px "Space Grotesk", sans-serif`; g.fillStyle = '#7ff3ea'; g.textAlign = 'left'; g.direction = 'ltr'; g.textBaseline = 'top';
    g.fillText(`${((this.route.cum.at(-1)! - info.remainingM) / 1000).toFixed(2)} / ${this.route.distanceKm.toFixed(2)} km`, 44 * u, 44 * u);
    g.fillStyle = '#e2e8f0'; g.font = `500 ${Math.round(22 * u)}px Inter, sans-serif`;
    g.fillText(`${info.elevation != null ? Math.round(info.elevation) + ' m' : ''}  ·  ↑ ${this.route.ascent} m`, 44 * u, 88 * u);
  }

  private watermark() {
    const g = this.ctx, u = Math.min(this.W, this.H) / 1080;
    g.globalAlpha = 0.75; g.font = `700 ${Math.round(22 * u)}px "Space Grotesk", sans-serif`; g.fillStyle = '#fff'; g.textAlign = 'right'; g.direction = 'ltr'; g.textBaseline = 'bottom';
    g.fillText('SSBN', this.W - 28 * u, this.H - 24 * u); g.globalAlpha = 1;
  }

  destroy() { this.journey?.destroy(); this.journey = null; }
}
