/**
 * Offline storage (IndexedDB). Journeys, live tracks, photos, offline regions,
 * saved destinations, video projects and settings all stay on the device.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Journey, TrackPoint } from '../route/types';

export interface OfflineRegion {
  id: string; name: string; bbox: [number, number, number, number]; minZoom: number; maxZoom: number;
  tileUrls: string[]; bytes: number; createdAt: string; complete: boolean; failed: number;
}
export interface SavedDestination { id: string; name: string; lon: number; lat: number; category?: string; source?: string; savedAt: string }
export interface PhotoRecord { id: string; journeyId: string; blob: Blob; name: string; takenAt?: string; lon?: number; lat?: number }
export interface VideoProject { id: string; name: string; updatedAt: string; data: unknown }
export interface ActiveTrack { id: 'active'; points: TrackPoint[]; startedAt: number; plannedJourneyId?: string }

interface SWDB extends DBSchema {
  journeys: { key: string; value: Journey; indexes: { byCreated: string } };
  activeTrack: { key: string; value: ActiveTrack };
  photos: { key: string; value: PhotoRecord; indexes: { byJourney: string } };
  regions: { key: string; value: OfflineRegion };
  destinations: { key: string; value: SavedDestination };
  videoProjects: { key: string; value: VideoProject };
  outbox: { key: number; value: { kind: string; payload: unknown; createdAt: string }; autoIncrement: true };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<SWDB>> | null = null;
export function db() {
  dbp ??= openDB<SWDB>('samir-wanderung', 1, {
    upgrade(d) {
      d.createObjectStore('journeys', { keyPath: 'id' }).createIndex('byCreated', 'createdAt');
      d.createObjectStore('activeTrack', { keyPath: 'id' });
      d.createObjectStore('photos', { keyPath: 'id' }).createIndex('byJourney', 'journeyId');
      d.createObjectStore('regions', { keyPath: 'id' });
      d.createObjectStore('destinations', { keyPath: 'id' });
      d.createObjectStore('videoProjects', { keyPath: 'id' });
      d.createObjectStore('outbox', { autoIncrement: true });
      d.createObjectStore('kv');
    },
  });
  return dbp;
}

export const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const Journeys = {
  async list(): Promise<Journey[]> { return (await (await db()).getAllFromIndex('journeys', 'byCreated')).reverse(); },
  async get(id: string) { return (await db()).get('journeys', id); },
  async put(j: Journey) { await (await db()).put('journeys', j); notify(); return j; },
  async remove(id: string) {
    const d = await db();
    const tx = d.transaction(['journeys', 'photos'], 'readwrite');
    await tx.objectStore('journeys').delete(id);
    for (const k of await tx.objectStore('photos').index('byJourney').getAllKeys(id)) await tx.objectStore('photos').delete(k);
    await tx.done; notify();
  },
};

export const ActiveTracks = {
  async get() { return (await db()).get('activeTrack', 'active'); },
  async append(points: TrackPoint[], startedAt: number, plannedJourneyId?: string) {
    const d = await db();
    const tx = d.transaction('activeTrack', 'readwrite');
    const cur = (await tx.store.get('active')) ?? { id: 'active' as const, points: [], startedAt, plannedJourneyId };
    cur.points.push(...points);
    await tx.store.put(cur); await tx.done;
  },
  async clear() { await (await db()).delete('activeTrack', 'active'); },
};

export const Photos = {
  async add(p: PhotoRecord) { await (await db()).put('photos', p); },
  async forJourney(id: string) { return (await db()).getAllFromIndex('photos', 'byJourney', id); },
  async remove(id: string) { await (await db()).delete('photos', id); },
};

export const Regions = {
  async list() { return (await db()).getAll('regions'); },
  async put(r: OfflineRegion) { await (await db()).put('regions', r); },
  async remove(id: string) { await (await db()).delete('regions', id); },
};

export const Destinations = {
  async list() { return (await db()).getAll('destinations'); },
  async put(d: SavedDestination) { await (await db()).put('destinations', d); },
  async remove(id: string) { await (await db()).delete('destinations', id); },
};

export const VideoProjects = {
  async list() { return (await db()).getAll('videoProjects'); },
  async put(p: VideoProject) { await (await db()).put('videoProjects', p); },
  async remove(id: string) { await (await db()).delete('videoProjects', id); },
};

export const KV = {
  async get<T>(k: string): Promise<T | undefined> { return (await (await db()).get('kv', k)) as T | undefined; },
  async set(k: string, v: unknown) { await (await db()).put('kv', v, k); },
};

/** Deletes every local record (journeys, tracks, photos, offline maps, settings). */
export async function deleteAllLocalData() {
  const d = await db();
  for (const s of ['journeys', 'activeTrack', 'photos', 'regions', 'destinations', 'videoProjects', 'outbox', 'kv'] as const) await d.clear(s);
  if ('caches' in window) for (const k of await caches.keys()) if (k.startsWith('sw-offline')) await caches.delete(k);
  try { Object.keys(localStorage).filter((k) => k.startsWith('sw.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  notify();
}

export async function storageEstimate(): Promise<{ usage: number | null; quota: number | null; persisted: boolean }> {
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  return { usage: est.usage ?? null, quota: est.quota ?? null, persisted };
}

const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }
export function onJourneysChanged(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
