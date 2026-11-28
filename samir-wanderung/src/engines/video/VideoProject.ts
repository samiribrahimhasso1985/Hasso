/** Journey Video Studio project model (serialisable, saved in IndexedDB). */
import type { CameraMode } from '../animation/controllers';

export type SceneType = 'title' | 'worldZoom' | 'route' | 'photo' | 'clip' | 'end';

export interface Scene {
  id: string;
  type: SceneType;
  duration: number; // seconds
  text?: string;
  subtitle?: string;
  camera?: CameraMode;
  cameraDistance?: number; // 0.6..2
  cameraPitch?: number;
  /** For route scenes: portion of the route (0..1). */
  from?: number;
  to?: number;
  mediaId?: string; // photo/clip stored in IndexedDB (key in photos store) or session object URL key
  mediaName?: string;
  transition?: 'cut' | 'fade';
}

export interface OutputProfile { width: number; height: number; fps: 25 | 30 | 60; bitrate: number }

export const FORMATS = {
  landscape: { width: 1920, height: 1080, label: '1920×1080 (16:9)' },
  vertical: { width: 1080, height: 1920, label: '1080×1920 (9:16)' },
  square: { width: 1080, height: 1080, label: '1080×1080 (1:1)' },
} as const;
export type FormatKey = keyof typeof FORMATS;

export interface AudioTrack { kind: 'music' | 'ambientWind' | 'ambientForest' | 'footsteps'; mediaId?: string; mediaName?: string; volume: number; fadeIn: number; fadeOut: number }

export interface Branding { intro: boolean; watermark: boolean; endScreen: boolean; creditText: string }

export interface VideoProjectData {
  version: 1;
  journeyId: string | null;
  title: string;
  destination: string;
  country: string;
  date: string;
  format: FormatKey;
  fps: 25 | 30 | 60;
  bitrateMbps: number;
  scenes: Scene[];
  audio: AudioTrack[];
  branding: Branding;
  showStats: boolean;
  exports: { at: string; format: string; fps: number; bytes: number; codec: string; durationS: number }[];
}

export function defaultProject(journeyId: string | null, title: string, destination: string): VideoProjectData {
  const s = (p: Partial<Scene> & Pick<Scene, 'type' | 'duration'>): Scene => ({ id: Math.random().toString(36).slice(2, 9), transition: 'fade', ...p });
  return {
    version: 1, journeyId, title, destination, country: '', date: new Date().toISOString().slice(0, 10), format: 'landscape', fps: 30, bitrateMbps: 8,
    scenes: [
      s({ type: 'title', duration: 3, text: title, subtitle: destination }),
      s({ type: 'worldZoom', duration: 5 }),
      s({ type: 'route', duration: 6, camera: 'aerial', from: 0, to: 0, text: 'reveal' }),
      s({ type: 'route', duration: 14, camera: 'follow', from: 0, to: 1, cameraDistance: 1, cameraPitch: 62 }),
      s({ type: 'end', duration: 4, text: title }),
    ],
    audio: [{ kind: 'ambientWind', volume: 0.35, fadeIn: 1.5, fadeOut: 2 }],
    branding: { intro: true, watermark: true, endScreen: true, creditText: '' },
    showStats: true, exports: [],
  };
}

export const projectDuration = (p: VideoProjectData) => p.scenes.reduce((a, s) => a + s.duration, 0);

export function sceneAt(p: VideoProjectData, t: number): { scene: Scene; local: number; index: number } | null {
  let acc = 0;
  for (let i = 0; i < p.scenes.length; i++) {
    const s = p.scenes[i];
    if (t < acc + s.duration || i === p.scenes.length - 1) return { scene: s, local: Math.min(s.duration, t - acc), index: i };
    acc += s.duration;
  }
  return null;
}
