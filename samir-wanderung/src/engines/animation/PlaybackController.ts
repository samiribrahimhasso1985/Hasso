/**
 * PlaybackController — requestAnimationFrame clock with play/pause/resume/restart/seek/speed.
 * Time advances by real elapsed time × speed, so playback is smooth and the frame content is a
 * pure function of `time` (see JourneyTimeline). UI subscribes at a throttled rate to avoid
 * React re-renders every frame.
 */
export type Speed = 0.5 | 1 | 2 | 4;
export const SPEEDS: Speed[] = [0.5, 1, 2, 4];

export interface PlaybackSnapshot { time: number; duration: number; playing: boolean; speed: Speed; ended: boolean }

export class PlaybackController {
  private raf: number | null = null;
  private last = 0;
  private uiLast = 0;
  time = 0;
  speed: Speed = 1;
  playing = false;
  private frameSubs = new Set<(t: number) => void>();
  private uiSubs = new Set<(s: PlaybackSnapshot) => void>();

  constructor(public duration: number, private uiHz = 10,
    private raf_ = (cb: FrameRequestCallback) => requestAnimationFrame(cb), private caf_ = (id: number) => cancelAnimationFrame(id)) {}

  onFrame(fn: (t: number) => void) { this.frameSubs.add(fn); return () => this.frameSubs.delete(fn); }
  onUi(fn: (s: PlaybackSnapshot) => void) { this.uiSubs.add(fn); fn(this.snapshot()); return () => this.uiSubs.delete(fn); }
  snapshot(): PlaybackSnapshot { return { time: this.time, duration: this.duration, playing: this.playing, speed: this.speed, ended: this.time >= this.duration }; }

  play() {
    if (this.playing) return;
    if (this.time >= this.duration) this.time = 0;
    this.playing = true; this.last = performance.now();
    this.raf = this.raf_(this.tick);
    this.emitUi(true);
  }
  pause() { this.playing = false; if (this.raf !== null) this.caf_(this.raf); this.raf = null; this.emitUi(true); }
  resume() { this.play(); }
  restart() { this.seek(0); this.play(); }
  toggle() { this.playing ? this.pause() : this.play(); }
  setSpeed(s: Speed) { this.speed = s; this.emitUi(true); }

  seek(t: number) {
    this.time = Math.max(0, Math.min(this.duration, t));
    this.frameSubs.forEach((f) => f(this.time));
    this.emitUi(true);
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    // Clamp dt so a backgrounded tab does not jump far ahead on return.
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.time = Math.min(this.duration, this.time + dt * this.speed);
    this.frameSubs.forEach((f) => f(this.time));
    if (this.time >= this.duration) { this.playing = false; this.raf = null; this.emitUi(true); return; }
    this.emitUi(false);
    this.raf = this.raf_(this.tick);
  };

  private emitUi(force: boolean) {
    const now = performance.now();
    if (!force && now - this.uiLast < 1000 / this.uiHz) return;
    this.uiLast = now;
    const s = this.snapshot();
    this.uiSubs.forEach((f) => f(s));
  }

  destroy() { this.pause(); this.frameSubs.clear(); this.uiSubs.clear(); }
}
