import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { Btn, Empty, Glass, ElevationProfile } from '../ui/components';
import { Journeys } from '../engines/storage/db';
import { CinematicJourney, type JourneyFrameInfo } from '../engines/animation/CinematicJourney';
import { SPEEDS, type PlaybackSnapshot, type Speed } from '../engines/animation/PlaybackController';
import type { CameraMode } from '../engines/animation/controllers';
import type { MapEngine } from '../engines/map/MapEngine';
import type { Journey } from '../engines/route/types';

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Cinematic() {
  const { t, fmt } = useI18n();
  const { activeJourney, setActiveJourney, settings, go } = useStore();
  const [list, setList] = useState<Journey[]>([]);
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const cj = useRef<CinematicJourney | null>(null);
  const [snap, setSnap] = useState<PlaybackSnapshot | null>(null);
  const [info, setInfo] = useState<JourneyFrameInfo | null>(null);
  const [cam, setCam] = useState<CameraMode>('follow');
  const [camDist, setCamDist] = useState(1);
  const [pitch, setPitch] = useState(62);
  const [arrived, setArrived] = useState(false);
  const route = activeJourney?.route ?? null;

  useEffect(() => { Journeys.list().then((j) => setList(j.filter((x) => x.route))).catch(() => {}); }, []);

  useEffect(() => {
    if (!engine || !route) return;
    engine.clearMarkers();
    engine.addMarker(route.coords[0], 'start', 'A');
    engine.addMarker(route.coords.at(-1)!, 'end', 'B');
    route.waypointDistances.slice(1, -1).forEach((_, i) => {
      const idx = route.cum.findIndex((c) => c >= route.waypointDistances[i + 1]);
      engine.addMarker(route.coords[Math.max(0, idx)], 'stop', String(i + 1));
    });
    engine.setRoutes([route], route.id);
    const j = new CinematicJourney(engine, route, { reducedMotion: settings.reducedMotion, onArrive: setArrived });
    cj.current = j;
    j.camera.setMode('follow');
    // Throttled UI updates (10 Hz) — the map itself updates every animation frame outside React.
    const offUi = j.playback.onUi((s) => { setSnap(s); setInfo(j.info); });
    return () => { offUi(); j.destroy(); cj.current = null; };
  }, [engine, route, settings.reducedMotion]);

  // Space toggles play; arrows seek.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const p = cj.current?.playback; if (!p || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); p.toggle(); }
      if (e.code === 'ArrowRight') p.seek(p.time + 5);
      if (e.code === 'ArrowLeft') p.seek(p.time - 5);
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);

  const setCamera = (m: CameraMode) => { setCam(m); cj.current?.setCameraMode(m); };
  const p = cj.current?.playback;

  if (!route) {
    return (
      <div className="page">
        <div className="flex items-center gap-3 mb-4"><h1 className="font-display text-2xl text-white">{t('nav.cinematic')}</h1><span className="badge badge-sim">{t('cine.label')}</span></div>
        <Glass className="p-4">
          <p className="text-sm text-slate-300 mb-3">{t('cine.chooseRoute')}</p>
          {list.length === 0 ? <Empty><Btn variant="primary" onClick={() => go('planner')}>{t('nav.planner')}</Btn></Empty> : (
            <ul className="divide-y divide-white/5">{list.map((j) => (
              <li key={j.id} className="py-2 flex justify-between items-center gap-2">
                <span className="text-sm truncate">{j.name} <span className="text-slate-400 text-xs">{fmt(j.route!.distanceKm)} km</span></span>
                <Btn variant="primary" onClick={() => setActiveJourney(j)}>▶ {t('cine.play')}</Btn>
              </li>))}</ul>
          )}
        </Glass>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-56px)] md:h-screen">
      <MapView className="absolute inset-0" center={route.coords[0]} zoom={13} pitch={60} onReady={setEngine} showControls={cam === 'free'}>
        {!settings.lowPower && <div className="vignette" />}
      </MapView>

      <div className="absolute top-3 start-3 z-20 flex flex-col gap-2 max-w-[calc(100%-1.5rem)]">
        <Glass className="px-3 py-2 flex items-center gap-2" role="status">
          <span className="badge badge-sim" data-testid="sim-label">{t('cine.label')}</span>
          <span className="text-xs text-slate-300 truncate">{activeJourney?.name}</span>
        </Glass>
        <p className="text-[11px] text-slate-300 glass px-2 py-1">{t('cine.notGps')}</p>
        {settings.reducedMotion && <p className="text-[11px] text-amber-200 glass px-2 py-1">{t('cine.reducedMotion')}</p>}
      </div>

      {arrived && (
        <div className="absolute inset-x-0 top-1/4 z-20 flex justify-center pointer-events-none">
          <div className="glass px-6 py-4 text-center fade-in" data-testid="arrival">
            <div className="font-display text-2xl tracking-widest text-aqua-300">{t('cine.arrived')}</div>
            <div className="text-sm text-slate-200 mt-1">{fmt(route.distanceKm, 2)} km · ↑{route.ascent} m · ↓{route.descent} m</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 inset-x-3 z-20">
        <Glass className="p-3 max-w-4xl mx-auto space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" data-testid="play" onClick={() => p?.toggle()} aria-label={snap?.playing ? t('cine.pause') : t('cine.play')}>
              {snap?.playing ? '❚❚ ' + t('cine.pause') : '▶ ' + (snap && snap.time > 0 && !snap.ended ? t('cine.resume') : t('cine.play'))}
            </Btn>
            <Btn onClick={() => p?.restart()} data-testid="restart">↺ {t('cine.restart')}</Btn>
            <div className="flex gap-1" role="group" aria-label={t('cine.speed')}>
              {SPEEDS.map((s) => <button key={s} className={`btn btn-chip text-xs ${snap?.speed === s ? 'is-active' : ''}`} aria-pressed={snap?.speed === s} onClick={() => p?.setSpeed(s as Speed)}>{s}x</button>)}
            </div>
            <div className="flex gap-1 ms-auto" role="group" aria-label="Camera">
              {(['follow', 'aerial', 'free'] as CameraMode[]).map((m) => <button key={m} data-testid={`cam-${m}`} className={`btn btn-chip text-xs ${cam === m ? 'is-active' : ''}`} aria-pressed={cam === m} onClick={() => setCamera(m)}>{t(`cine.cam.${m}` as const)}</button>)}
            </div>
          </div>
          <input type="range" className="w-full accent-aqua-400" min={0} max={snap?.duration ?? 1} step={0.05} value={snap?.time ?? 0}
            onChange={(e) => p?.seek(+e.target.value)} aria-label="Timeline" data-testid="timeline" dir="ltr" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="text-slate-400">{t('cine.progress')} </span><span className="text-white" data-testid="progress">{info ? Math.round((info.state.distance / route.cum.at(-1)!) * 100) : 0}%</span> <span className="text-slate-500">({info?.state.phase})</span></div>
            <div><span className="text-slate-400">{t('cine.position')} </span><span className="text-white font-mono" data-testid="position">{info ? `${info.position[1].toFixed(5)}, ${info.position[0].toFixed(5)}` : '–'}</span>{info?.elevation != null && <span className="text-aqua-300"> · {Math.round(info.elevation)} m</span>}</div>
            <div><span className="text-slate-400">{t('cine.remaining')} </span><span className="text-white" data-testid="remaining">{info ? fmt(info.remainingM / 1000, 2) : '–'} km</span></div>
            <div><span className="text-slate-400">{t('cine.remainingTime')} </span><span className="text-white">{snap ? fmtTime((snap.duration - snap.time) / snap.speed) : '–'}</span></div>
          </div>
          {cam !== 'free' && (
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2">{t('cine.distanceCam')}<input type="range" min={0.6} max={2} step={0.1} value={camDist} onChange={(e) => { setCamDist(+e.target.value); if (cj.current) cj.current.camera.params.distance = +e.target.value; }} /></label>
              <label className="flex items-center gap-2">{t('cine.pitch')}<input type="range" min={30} max={80} step={1} value={pitch} onChange={(e) => { setPitch(+e.target.value); if (cj.current) cj.current.camera.params.pitch = +e.target.value; }} /></label>
            </div>
          )}
          <div className="hidden md:block"><ElevationProfile samples={route.elevation} height={70} marker={info?.state.distance ?? null} onHover={() => {}} /></div>
        </Glass>
      </div>
    </div>
  );
}
