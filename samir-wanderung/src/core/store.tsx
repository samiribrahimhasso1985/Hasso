import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Place, Route, RouteType, Journey } from '../engines/route/types';

export type PageId = 'home' | 'world' | 'planner' | 'cinematic' | 'live' | 'mountain' | 'journeys' | 'atlas' | 'assistant' | 'community' | 'studio' | 'safety' | 'offline' | 'settings';
export const PAGES: PageId[] = ['home', 'world', 'planner', 'cinematic', 'live', 'mountain', 'journeys', 'atlas', 'assistant', 'community', 'studio', 'safety', 'offline', 'settings'];

export interface Settings { reducedMotion: boolean; lowPower: boolean; batterySaver: boolean }

export interface PlanState { points: (Place | null)[]; type: RouteType; roundTrip: boolean }

interface Store {
  page: PageId;
  param: string | null;
  go: (p: PageId, param?: string | null) => void;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  plan: PlanState;
  setPlan: (p: Partial<PlanState> | ((p: PlanState) => PlanState)) => void;
  routes: Route[];
  setRoutes: (r: Route[]) => void;
  selectedRouteId: string | null;
  selectRoute: (id: string | null) => void;
  /** Journey used by Cinematic / Live / Studio. */
  activeJourney: Journey | null;
  setActiveJourney: (j: Journey | null) => void;
  /** Map focus requested by another page (e.g. Atlas → Explore in 3D). */
  focus: { coord: [number, number]; name: string; zoom?: number } | null;
  setFocus: (f: Store['focus']) => void;
  online: boolean;
}

const Ctx = createContext<Store | null>(null);

function parseHash(): { page: PageId; param: string | null } {
  const [p, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: (PAGES as string[]).includes(p) ? (p as PageId) : 'home', param: param ? decodeURIComponent(param) : null };
}

function loadSettings(): Settings {
  const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const s = JSON.parse(localStorage.getItem('sw.settings') || 'null');
    if (s) return { reducedMotion: prefersReduced || !!s.reducedMotion, lowPower: !!s.lowPower, batterySaver: !!s.batterySaver };
  } catch { /* ignore */ }
  return { reducedMotion: prefersReduced, lowPower: false, batterySaver: false };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [{ page, param }, setLoc] = useState(parseHash);
  const [settings, setSettingsState] = useState(loadSettings);
  const [plan, setPlanState] = useState<PlanState>({ points: [null, null], type: 'standard', roundTrip: false });
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, selectRoute] = useState<string | null>(null);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [focus, setFocus] = useState<Store['focus']>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onHash = () => setLoc(parseHash());
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('hashchange', onHash); addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('hashchange', onHash); removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);

  const go = useCallback((p: PageId, prm: string | null = null) => { location.hash = `/${p}${prm ? '/' + encodeURIComponent(prm) : ''}`; }, []);
  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((cur) => {
    const n = { ...cur, ...s };
    try { localStorage.setItem('sw.settings', JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  }), []);
  const setPlan = useCallback((p: Partial<PlanState> | ((p: PlanState) => PlanState)) => setPlanState((cur) => (typeof p === 'function' ? p(cur) : { ...cur, ...p })), []);

  const value = useMemo<Store>(() => ({ page, param, go, settings, setSettings, plan, setPlan, routes, setRoutes, selectedRouteId, selectRoute, activeJourney, setActiveJourney, focus, setFocus, online }),
    [page, param, go, settings, setSettings, plan, setPlan, routes, selectedRouteId, activeJourney, focus, online]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
