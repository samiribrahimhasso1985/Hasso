import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { Btn, Glass, PlaceSearch, Spinner, ErrorBox } from '../ui/components';
import { MapView } from '../ui/MapView';
import { GlobeEngine } from '../engines/globe/GlobeEngine';
import { webglSupported, type MapEngine } from '../engines/map/MapEngine';
import type { Place } from '../engines/route/types';
import type { LngLat } from '../engines/route/geo';
import { CESIUM_ION_TOKEN } from '../config/providers';
import { api } from '../core/api';

type CamMode = 'globe' | 'satellite' | 'terrain' | 'flyover' | 'free';

/** Real continent centroids (approximate geographic centres) for quick navigation. */
export const CONTINENTS: { id: string; name: string; coord: LngLat; height: number }[] = [
  { id: 'europe', name: 'Europe', coord: [15, 52], height: 5_500_000 },
  { id: 'asia', name: 'Asia', coord: [90, 40], height: 9_000_000 },
  { id: 'africa', name: 'Africa', coord: [20, 3], height: 8_500_000 },
  { id: 'namerica', name: 'North America', coord: [-100, 45], height: 8_500_000 },
  { id: 'samerica', name: 'South America', coord: [-60, -15], height: 8_000_000 },
  { id: 'oceania', name: 'Oceania', coord: [140, -25], height: 7_500_000 },
  { id: 'antarctica', name: 'Antarctica', coord: [0, -82], height: 7_000_000 },
];

/**
 * Digital globe (CesiumJS) with a cinematic hand-off to MapLibre 3D terrain:
 * globe → eased flight to the selected place → crossfade into the detailed DEM terrain map
 * at the same centre → slow reveal orbit → stable 3D view.
 */
export default function WorldExplorer() {
  const { t } = useI18n();
  const { settings, setFocus, go, setPlan, param } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [mode, setMode] = useState<CamMode>('globe');
  const [target, setTarget] = useState<Place | null>(null);
  const [terrainView, setTerrainView] = useState(false);
  const [fade, setFade] = useState(false);
  const [rotate, setRotate] = useState(!settings.reducedMotion);
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const noGl = !webglSupported();

  useEffect(() => {
    if (noGl || !ref.current) return;
    let g: GlobeEngine | null = null, alive = true;
    GlobeEngine.create(ref.current, { lowPower: settings.lowPower }).then((x) => {
      if (!alive) { x.destroy(); return; }
      g = x; globeRef.current = x; setReady(true);
      x.setAutoRotate(rotate);
      x.onPick(async ({ coord }) => {
        try {
          const r = await api<{ name: string | null; displayName: string | null }>(`/api/reverse?lon=${coord[0]}&lat=${coord[1]}`);
          const name = r.name ?? `${coord[1].toFixed(3)}, ${coord[0].toFixed(3)}`;
          setPicked(r.displayName ?? name);
          x.setMarker(coord, name);
          setTarget({ name, coord, origin: 'map', detail: r.displayName ?? undefined });
        } catch { x.setMarker(coord, `${coord[1].toFixed(3)}, ${coord[0].toFixed(3)}`); setTarget({ name: `${coord[1].toFixed(3)}, ${coord[0].toFixed(3)}`, coord, origin: 'map' }); }
      });
    }).catch(setErr);
    return () => { alive = false; g?.destroy(); globeRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { globeRef.current?.setAutoRotate(rotate && !terrainView); }, [rotate, terrainView]);

  // Deep link from Atlas: #/world/lon,lat,name
  useEffect(() => {
    if (!ready || !param) return;
    const [lon, lat, ...rest] = param.split(',');
    if (Number.isFinite(+lon) && Number.isFinite(+lat)) flyTo({ name: rest.join(',') || param, coord: [+lon, +lat], origin: 'atlas' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, param]);

  const flyTo = async (p: Place) => {
    const g = globeRef.current; if (!g) return;
    setTarget(p); setTerrainView(false); setMode('flyover');
    g.setAutoRotate(false); g.setMarker(p.coord, p.name);
    await g.flyTo(p.coord, { finalHeight: 12000, reducedMotion: settings.reducedMotion });
    // Hand-off: crossfade to the MapLibre DEM terrain at the same spot.
    setFade(true);
    setTimeout(() => { setTerrainView(true); setMode('terrain'); setFocus({ coord: p.coord, name: p.name }); }, settings.reducedMotion ? 0 : 500);
  };

  // Reveal orbit after the hand-off, then stable view.
  useEffect(() => {
    if (!engine || !terrainView || !target) return;
    engine.map.jumpTo({ center: target.coord, zoom: 11.2, pitch: 45, bearing: 0 });
    setTimeout(() => setFade(false), 100);
    if (settings.reducedMotion) { engine.map.jumpTo({ center: target.coord, zoom: 13, pitch: 60 }); return; }
    engine.map.easeTo({ center: target.coord, zoom: 13.2, pitch: 68, bearing: -35, duration: 6000, easing: (x) => 1 - (1 - x) ** 3 });
  }, [engine, terrainView, target, settings.reducedMotion]);

  const returnToGlobe = () => {
    setTerrainView(false); setEngine(null); setMode('globe'); setFade(false);
    globeRef.current?.returnToGlobe(settings.reducedMotion);
    setTimeout(() => globeRef.current?.setAutoRotate(rotate), 3200);
  };

  const applyMode = (m: CamMode) => {
    setMode(m);
    if (m === 'globe') return returnToGlobe();
    if (!terrainView) { if (target && (m === 'terrain' || m === 'satellite')) flyTo(target); return; }
    if (m === 'satellite') engine?.setMode('satellite');
    if (m === 'terrain') engine?.setMode('terrain');
    if (m === 'flyover' && engine && target && !settings.reducedMotion) engine.map.easeTo({ bearing: engine.map.getBearing() + 180, pitch: 70, duration: 12000, easing: (x) => x });
    if (m === 'free' && engine) { engine.map.stop(); }
  };

  if (noGl) return <div className="page"><p>{t('map.webglMissing')}</p></div>;

  return (
    <div className="relative h-[calc(100vh-56px)] md:h-screen overflow-hidden bg-black">
      <div ref={ref} className={`absolute inset-0 transition-opacity duration-500 ${terrainView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} data-testid="globe" />
      {terrainView && target && (
        <MapView className={`absolute inset-0 transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`} center={target.coord} zoom={11.2} pitch={45} onReady={setEngine} />
      )}
      {!ready && !err && <div className="absolute inset-0 flex items-center justify-center"><Spinner label={t('common.loading')} /></div>}
      {err != null && <div className="absolute inset-x-4 top-20"><ErrorBox error={err} /></div>}

      <div className="absolute top-3 start-3 end-3 md:end-auto md:w-[380px] z-20 space-y-2">
        <Glass className="p-3">
          <div className="font-display text-xs tracking-[0.3em] text-aqua-300 mb-2">SSBN · {t('nav.world')}</div>
          <PlaceSearch id="world-search" label={t('common.search')} value={target} onChange={(p) => p && flyTo(p)} allowGps={false} />
          <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label={t('atlas.continent')}>
            {CONTINENTS.map((c) => (
              <button key={c.id} className="btn btn-chip text-[11px]" onClick={() => { if (terrainView) { setTerrainView(false); setEngine(null); setFade(false); } setMode('globe'); if (globeRef.current) flyToContinent(globeRef.current, c, settings.reducedMotion); }}>{c.name}</button>
            ))}
          </div>
          {picked && !terrainView && <p className="text-xs text-slate-300 mt-2">⌖ {picked}</p>}
          {target && !terrainView && <Btn variant="primary" className="mt-2 w-full" onClick={() => flyTo(target)}>↘ {t('map.mode.terrain')}</Btn>}
        </Glass>
        {!CESIUM_ION_TOKEN && <p className="text-[10px] text-slate-400 glass px-2 py-1">Globe: Esri imagery on a smooth ellipsoid (no Cesium ion token configured). Detailed real terrain is shown after zooming in (AWS Terrain Tiles via MapLibre).</p>}
      </div>

      <div className="absolute bottom-8 inset-x-3 md:inset-x-auto md:start-1/2 md:-translate-x-1/2 rtl:md:translate-x-1/2 z-20">
        <Glass className="p-1.5 flex flex-wrap justify-center gap-1" role="toolbar" aria-label="Camera mode">
          {(['globe', 'satellite', 'terrain', 'flyover', 'free'] as CamMode[]).map((m) => (
            <button key={m} className={`btn btn-chip text-xs ${mode === m ? 'is-active' : ''}`} aria-pressed={mode === m} onClick={() => applyMode(m)}>{t(`map.mode.${m}` as const)}</button>
          ))}
          {!terrainView && <>
            <button className="btn btn-chip text-xs" aria-label={t('map.zoomIn')} onClick={() => globeRef.current?.zoom(2)}>＋</button>
            <button className="btn btn-chip text-xs" aria-label={t('map.zoomOut')} onClick={() => globeRef.current?.zoom(0.5)}>－</button>
            <button className={`btn btn-chip text-xs ${rotate ? 'is-active' : ''}`} aria-pressed={rotate} onClick={() => setRotate(!rotate)}>⟳ {t('map.rotate')}</button>
          </>}
          <button className="btn btn-chip text-xs" onClick={() => document.documentElement.requestFullscreen?.()} aria-label={t('map.fullscreen')}>⛶</button>
          {terrainView && <button className="btn btn-chip text-xs" onClick={returnToGlobe}>◍ {t('map.returnGlobe')}</button>}
          {terrainView && target && <button className="btn btn-chip text-xs" onClick={() => { setPlan((c) => { const pts = [...c.points]; pts[pts.length - 1] = target; return { ...c, points: pts }; }); go('planner'); }}>⇢ {t('atlas.planHike')}</button>}
        </Glass>
      </div>
    </div>
  );
}

async function flyToContinent(g: GlobeEngine, c: (typeof CONTINENTS)[number], reduced: boolean) {
  const C = await import('cesium');
  g.setAutoRotate(false);
  const dest = C.Cartesian3.fromDegrees(c.coord[0], c.coord[1], c.height);
  if (reduced) g.viewer.camera.setView({ destination: dest }); else g.viewer.camera.flyTo({ destination: dest, duration: 2.5, easingFunction: C.EasingFunction.CUBIC_IN_OUT });
}
