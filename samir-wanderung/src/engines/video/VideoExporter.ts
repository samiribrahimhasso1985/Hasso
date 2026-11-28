/**
 * Real video export: frames are rendered from the live MapLibre scene (real terrain + route),
 * composited with titles/photos/clips on a canvas, encoded with WebCodecs and muxed into MP4
 * with mp4-muxer. Audio (user music + generated ambience) is mixed offline and AAC/Opus encoded.
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { OutputProfile } from './VideoProject';

export interface CodecChoice { video: string; muxVideo: 'avc' | 'vp9'; label: string }

/** Pick the best supported video codec for the profile. H.264 first, VP9-in-MP4 fallback. */
export async function chooseVideoCodec(p: OutputProfile): Promise<CodecChoice | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  const mbps = (p.width * p.height * p.fps) / 256; // macroblocks per second
  const avcLevel = mbps <= 245760 ? '28' : mbps <= 522240 ? '2a' : '33'; // 4.0 / 4.2 / 5.1
  const candidates: CodecChoice[] = [
    { video: `avc1.6400${avcLevel}`, muxVideo: 'avc', label: 'H.264 High' },
    { video: `avc1.4d00${avcLevel}`, muxVideo: 'avc', label: 'H.264 Main' },
    { video: `avc1.4200${avcLevel}`, muxVideo: 'avc', label: 'H.264 Baseline' },
    { video: 'vp09.00.40.08', muxVideo: 'vp9', label: 'VP9' },
  ];
  for (const c of candidates) {
    try {
      const s = await VideoEncoder.isConfigSupported({ codec: c.video, width: p.width, height: p.height, bitrate: p.bitrate, framerate: p.fps, ...(c.muxVideo === 'avc' ? { avc: { format: 'avc' as const } } : {}) });
      if (s.supported) return c;
    } catch { /* try next */ }
  }
  return null;
}

export async function chooseAudioCodec(sampleRate: number, channels: number): Promise<{ codec: string; mux: 'aac' | 'opus' } | null> {
  if (typeof AudioEncoder === 'undefined') return null;
  for (const c of [{ codec: 'mp4a.40.2', mux: 'aac' as const }, { codec: 'opus', mux: 'opus' as const }]) {
    try { if ((await AudioEncoder.isConfigSupported({ codec: c.codec, sampleRate, numberOfChannels: channels, bitrate: 160_000 })).supported) return c; } catch { /* next */ }
  }
  return null;
}

export interface ExportResult { blob: Blob; codec: string; frames: number; durationS: number; hasAudio: boolean }

export class ExportCancelled extends Error { constructor() { super('cancelled'); } }

/**
 * Render and encode. `drawFrame(i, t)` must draw frame i onto `canvas` (and may await tiles).
 * Encoding is back-pressured so memory stays bounded on long renders.
 */
export async function exportVideo(opts: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  profile: OutputProfile;
  durationS: number;
  drawFrame: (i: number, t: number) => Promise<void>;
  audio?: AudioBuffer | null;
  signal: AbortSignal;
  onProgress: (fraction: number, frame: number, total: number) => void;
}): Promise<ExportResult> {
  const { profile: p } = opts;
  const vc = await chooseVideoCodec(p);
  if (!vc) throw new Error('video_codec_unsupported');
  const ac = opts.audio ? await chooseAudioCodec(opts.audio.sampleRate, opts.audio.numberOfChannels) : null;

  // Rough storage check before starting (bitrate × duration × 1.2 margin).
  const needed = ((p.bitrate + 200_000) / 8) * opts.durationS * 1.2;
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    if (est.quota != null && est.usage != null && est.quota - est.usage < needed) throw new Error('insufficient_storage');
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: vc.muxVideo, width: p.width, height: p.height, frameRate: p.fps },
    ...(ac && opts.audio ? { audio: { codec: ac.mux, sampleRate: opts.audio.sampleRate, numberOfChannels: opts.audio.numberOfChannels } } : {}),
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encodeError: Error | null = null;
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encodeError = e as Error; } });
  venc.configure({ codec: vc.video, width: p.width, height: p.height, bitrate: p.bitrate, framerate: p.fps, latencyMode: 'quality', ...(vc.muxVideo === 'avc' ? { avc: { format: 'avc' as const } } : {}) });

  const total = Math.max(1, Math.round(opts.durationS * p.fps));
  try {
    for (let i = 0; i < total; i++) {
      if (opts.signal.aborted) throw new ExportCancelled();
      if (encodeError) throw encodeError;
      const t = i / p.fps;
      await opts.drawFrame(i, t);
      const frame = new VideoFrame(opts.canvas, { timestamp: Math.round((i * 1e6) / p.fps), duration: Math.round(1e6 / p.fps) });
      venc.encode(frame, { keyFrame: i % (p.fps * 2) === 0 });
      frame.close();
      while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
      if (i % 5 === 0) { opts.onProgress(i / total, i, total); await new Promise((r) => setTimeout(r, 0)); } // keep UI responsive
    }
    await venc.flush();

    if (ac && opts.audio) {
      const a = opts.audio;
      const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { encodeError = e as Error; } });
      aenc.configure({ codec: ac.codec, sampleRate: a.sampleRate, numberOfChannels: a.numberOfChannels, bitrate: 160_000 });
      const block = 1024 * 4;
      const len = Math.min(a.length, Math.round(opts.durationS * a.sampleRate));
      for (let off = 0; off < len; off += block) {
        if (opts.signal.aborted) throw new ExportCancelled();
        const n = Math.min(block, len - off);
        const planar = new Float32Array(n * a.numberOfChannels);
        for (let ch = 0; ch < a.numberOfChannels; ch++) planar.set(a.getChannelData(ch).subarray(off, off + n), ch * n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: a.sampleRate, numberOfFrames: n, numberOfChannels: a.numberOfChannels, timestamp: Math.round((off / a.sampleRate) * 1e6), data: planar });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
    }
    if (encodeError) throw encodeError;
    muxer.finalize();
    opts.onProgress(1, total, total);
    return { blob: new Blob([target.buffer], { type: 'video/mp4' }), codec: `${vc.label} (${vc.video})${ac ? ` + ${ac.mux.toUpperCase()}` : ''}`, frames: total, durationS: total / p.fps, hasAudio: !!(ac && opts.audio) };
  } finally {
    if (venc.state !== 'closed') venc.close();
  }
}

/**
 * Offline audio mix: optional user music + generated ambience (filtered noise wind/forest,
 * synthesized footsteps). Everything generated here is original audio, not samples.
 */
export async function mixAudio(opts: {
  durationS: number; sampleRate?: number;
  tracks: { kind: 'music' | 'ambientWind' | 'ambientForest' | 'footsteps'; buffer?: ArrayBuffer; volume: number; fadeIn: number; fadeOut: number }[];
}): Promise<AudioBuffer | null> {
  if (!opts.tracks.length || typeof OfflineAudioContext === 'undefined') return null;
  const sr = opts.sampleRate ?? 48000;
  const len = Math.ceil(opts.durationS * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const noise = (() => { const b = ctx.createBuffer(2, len, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } return b; })();
  for (const tr of opts.tracks) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(tr.volume, Math.min(opts.durationS, tr.fadeIn || 0.01));
    gain.gain.setValueAtTime(tr.volume, Math.max(0, opts.durationS - (tr.fadeOut || 0.01)));
    gain.gain.linearRampToValueAtTime(0, opts.durationS);
    gain.connect(ctx.destination);
    if (tr.kind === 'music' && tr.buffer) {
      const src = ctx.createBufferSource(); src.buffer = await ctx.decodeAudioData(tr.buffer.slice(0)); src.connect(gain); src.start(0);
    } else if (tr.kind === 'ambientWind' || tr.kind === 'ambientForest') {
      const src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = tr.kind === 'ambientWind' ? 'lowpass' : 'bandpass';
      f.frequency.value = tr.kind === 'ambientWind' ? 500 : 2500; f.Q.value = tr.kind === 'ambientWind' ? 0.7 : 0.4;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15; const lg = ctx.createGain(); lg.gain.value = tr.kind === 'ambientWind' ? 250 : 400;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start(0);
      const g2 = ctx.createGain(); g2.gain.value = tr.kind === 'ambientWind' ? 0.6 : 0.12;
      src.connect(f); f.connect(g2); g2.connect(gain); src.start(0);
    } else if (tr.kind === 'footsteps') {
      // Short low thumps at ~1.8 steps/s.
      for (let t = 0.3; t < opts.durationS; t += 0.55) {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g); g.connect(gain); o.start(t); o.stop(t + 0.15);
      }
    }
  }
  return ctx.startRendering();
}
