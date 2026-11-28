import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { Btn, Glass, PlaceSearch, Empty } from '../ui/components';
import { Journeys, onJourneysChanged } from '../engines/storage/db';
import type { Journey, Place } from '../engines/route/types';
import type { MapEngine } from '../engines/map/MapEngine';

export default function Home() {
  const { t, fmt } = useI18n();
  const { go, plan, setPlan, setActiveJourney, settings, setFocus } = useStore();
  const [recent, setRecent] = useState<Journey[]>([]);
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [search, setSearch] = useState<Place | null>(null);

  useEffect(() => { const load = () => Journeys.list().then((j) => setRecent(j.slice(0, 6))).catch(() => setRecent([])); load(); return onJourneysChanged(load); }, []);

  // Slow cinematic orbit on the hero map (disabled with reduced motion).
  useEffect(() => {
    if (!engine || settings.reducedMotion) return;
    let raf = 0, last = performance.now(), stop = false;
    const interact = () => { stop = true; };
    engine.map.on('mousedown', interact); engine.map.on('touchstart', interact); engine.map.on('wheel', interact);
    const loop = (now: number) => {
      if (!stop) engine.map.setBearing(engine.map.getBearing() + (now - last) * 0.002);
      last = now; raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); engine.map.off('mousedown', interact); engine.map.off('touchstart', interact); engine.map.off('wheel', interact); };
  }, [engine, settings.reducedMotion]);

  useEffect(() => { if (search && engine) engine.flyTo(search.coord, 13, { pitch: 65 }); }, [search, engine]);

  const setPoint = (i: number, p: Place | null) => setPlan((cur) => { const pts = [...cur.points]; pts[i] = p; return { ...cur, points: pts }; });
  const start = plan.points[0], dest = plan.points[plan.points.length - 1];

  return (
    <div className="relative">
      {/* Hero: real 3D terrain of the Wetterstein range (Zugspitze) */}
      <MapView className="h-[62vh] md:h-[72vh]" center={[10.985, 47.421]} zoom={12.2} pitch={68} onReady={setEngine}>
        <div className="vignette" />
        <div className="absolute inset-x-0 top-0 p-4 md:p-8 pointer-events-none">
          <h1 className="font-display text-3xl md:text-6xl font-bold tracking-[0.15em] text-white drop-shadow-lg">SAMIR <span className="text-aqua-400">WANDERUNG</span></h1>
          <p className="mt-2 text-xs md:text-sm tracking-[0.3em] text-slate-200/90">{t('brand.tagline')}</p>
          <p className="mt-4 max-w-md text-sm md:text-base text-slate-300">{t('home.hero')}</p>
        </div>
        <div className="absolute bottom-10 start-3 end-16 md:end-auto md:w-[420px] z-10">
          <Glass className="p-3"><PlaceSearch id="home-search" label={t('common.search')} value={search} onChange={(p) => { setSearch(p); if (p) setFocus({ coord: p.coord, name: p.name }); }} allowGps={false} /></Glass>
        </div>
      </MapView>

      <div className="page grid gap-4 md:grid-cols-[1.2fr_1fr] -mt-6 relative z-10">
        <Glass className="p-4 md:p-5" as="section" aria-labelledby="plan-h">
          <h2 id="plan-h" className="font-display text-lg text-white mb-3">{t('nav.planner')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <PlaceSearch id="home-start" label={t('home.start')} value={start} onChange={(p) => setPoint(0, p)} />
            <PlaceSearch id="home-dest" label={t('home.destination')} value={dest} onChange={(p) => setPoint(plan.points.length - 1, p)} allowGps={false} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => go('planner', start && dest ? 'auto' : null)}>{t('home.plan')}</Btn>
            <Btn onClick={() => go('cinematic')}>▶ {t('home.cinematic')}</Btn>
            <Btn onClick={() => go('live')}>◎ {t('home.live')}</Btn>
            <Btn onClick={() => go('world')}>◍ {t('nav.world')}</Btn>
          </div>
        </Glass>
        <Glass className="p-4 md:p-5" as="section" aria-labelledby="recent-h">
          <h2 id="recent-h" className="font-display text-lg text-white mb-2">{t('home.recent')}</h2>
          {recent.length === 0 ? <Empty>{t('home.noRecent')}</Empty> : (
            <ul className="divide-y divide-white/5">
              {recent.map((j) => (
                <li key={j.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{j.name}</div>
                    <div className="text-xs text-slate-400">
                      {j.kind === 'planned' ? t('journeys.planned') : t('journeys.recorded')} · {new Date(j.createdAt).toLocaleDateString()}
                      {j.route && <> · {fmt(j.route.distanceKm)} km · ↑{j.route.ascent} m</>}
                    </div>
                  </div>
                  {j.route && <Btn variant="chip" onClick={() => { setActiveJourney(j); go('cinematic'); }}>▶</Btn>}
                </li>
              ))}
            </ul>
          )}
        </Glass>
      </div>
    </div>
  );
}
