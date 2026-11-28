import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n, type TKey } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { AttributionList, Btn, ElevationProfile, ErrorBox, Glass, PlaceSearch, Spinner, Stat, Toggle } from '../ui/components';
import { WeatherPanel } from '../ui/WeatherPanel';
import { calculateRoutes, ROUTE_TYPES } from '../engines/route/RouteEngine';
import { formatDuration } from '../engines/route/stats';
import { pointAlong } from '../engines/route/geo';
import { Journeys, uid } from '../engines/storage/db';
import type { MapEngine } from '../engines/map/MapEngine';
import type { Place, Route } from '../engines/route/types';
import { ApiError } from '../core/api';
import maplibregl from 'maplibre-gl';

export default function Planner() {
  const { t, fmt, lang } = useI18n();
  const { plan, setPlan, routes, setRoutes, selectedRouteId, selectRoute, go, setActiveJourney, param, focus, settings } = useStore();
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [hoverD, setHoverD] = useState<number | null>(null);
  const hoverMarker = useRef<maplibregl.Marker | null>(null);
  const abort = useRef<AbortController | null>(null);
  const flyRaf = useRef(0);
  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null;

  const setPoint = (i: number, p: Place | null) => setPlan((cur) => { const pts = [...cur.points]; pts[i] = p; return { ...cur, points: pts }; });

  // Map click → set the point currently being picked (reverse geocoded name when available).
  useEffect(() => {
    if (!engine || pickIndex === null) return;
    engine.map.getCanvas().style.cursor = 'crosshair';
    const off = engine.onClick(async ({ lngLat }) => {
      const i = pickIndex; setPickIndex(null);
      let name = `${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`;
      setPoint(i, { name, coord: lngLat, origin: 'map' });
      try {
        const r = await fetch(`/api/reverse?lon=${lngLat[0]}&lat=${lngLat[1]}&lang=${lang}`).then((x) => x.json());
        if (r.name) { name = r.name; setPoint(i, { name, coord: lngLat, origin: 'map', detail: r.displayName }); }
      } catch { /* keep coordinate name */ }
    });
    return () => { off(); engine.map.getCanvas().style.cursor = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, pickIndex, lang]);

  // Markers for chosen points.
  useEffect(() => {
    if (!engine) return;
    engine.clearMarkers();
    plan.points.forEach((p, i) => { if (p) engine.addMarker(p.coord, i === 0 ? 'start' : i === plan.points.length - 1 ? 'end' : 'stop', i === 0 ? 'A' : i === plan.points.length - 1 ? 'B' : String(i)); });
  }, [engine, plan.points]);

  useEffect(() => { if (engine) engine.setRoutes(routes, selected?.id); }, [engine, routes, selected?.id]);
  useEffect(() => { if (engine && focus && !routes.length) engine.flyTo(focus.coord, focus.zoom ?? 12.5); }, [engine, focus, routes.length]);

  // Elevation-profile hover ↔ map marker.
  useEffect(() => {
    if (!engine || !selected) return;
    if (hoverD == null) { hoverMarker.current?.remove(); hoverMarker.current = null; return; }
    const p = pointAlong(selected.coords, selected.cum, hoverD).coord;
    if (!hoverMarker.current) { const el = document.createElement('div'); el.className = 'sw-marker sw-marker-me'; hoverMarker.current = new maplibregl.Marker({ element: el }).setLngLat(p).addTo(engine.map); }
    else hoverMarker.current.setLngLat(p);
  }, [engine, selected, hoverD]);

  const calculate = useCallback(async () => {
    const pts = plan.points.filter(Boolean) as Place[];
    if (!plan.points[0] || !plan.points[plan.points.length - 1]) { setError(new ApiError(400, 'need_points')); return; }
    abort.current?.abort(); abort.current = new AbortController();
    setBusy(true); setError(null); setSaved(false);
    try {
      const rs = await calculateRoutes({ points: pts, type: plan.type, roundTrip: plan.roundTrip }, abort.current.signal);
      setRoutes(rs); selectRoute(rs[0].id);
      engine?.fitLine(rs.flatMap((r) => r.coords), { padding: 70 });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setRoutes([]); setError(e); }
    } finally { setBusy(false); }
  }, [plan, engine, setRoutes, selectRoute]);

  // Auto-calculate when arriving from Home / Assistant.
  const autoRan = useRef(false);
  useEffect(() => { if (param === 'auto' && engine && !autoRan.current) { autoRan.current = true; calculate(); } }, [param, engine, calculate]);
  useEffect(() => () => { abort.current?.abort(); cancelAnimationFrame(flyRaf.current); hoverMarker.current?.remove(); }, []);

  const save = async () => {
    if (!selected) return;
    const pts = plan.points.filter(Boolean) as Place[];
    const j = await Journeys.put({ id: uid('j'), kind: 'planned', name: `${pts[0].name} → ${pts.at(-1)!.name}`, createdAt: new Date().toISOString(), request: { points: pts, type: plan.type, roundTrip: plan.roundTrip }, route: selected });
    setActiveJourney(j); setSaved(true);
  };

  /** Camera flyover of the whole route (cancelled on unmount or user input). */
  const flyover = () => {
    if (!engine || !selected) return;
    cancelAnimationFrame(flyRaf.current);
    const total = selected.cum.at(-1)!;
    const dur = settings.reducedMotion ? 0 : Math.min(30, 8 + selected.distanceKm * 1.2) * 1000;
    if (!dur) { engine.fitLine(selected.coords, { duration: 0 }); return; }
    const t0 = performance.now();
    let bearing = engine.map.getBearing();
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / dur);
      const p = pointAlong(selected.coords, selected.cum, f * total);
      bearing += ((((p.bearing - bearing) % 360) + 540) % 360 - 180) * 0.04;
      engine.map.jumpTo({ center: p.coord, zoom: 13.6, pitch: 66, bearing });
      if (f < 1) flyRaf.current = requestAnimationFrame(step);
    };
    const stop = () => cancelAnimationFrame(flyRaf.current);
    engine.map.once('mousedown', stop); engine.map.once('touchstart', stop); engine.map.once('wheel', stop);
    flyRaf.current = requestAnimationFrame(step);
  };

  const diffKey = (d: Route['difficulty']) => `planner.diff.${d}` as TKey;
  const errCode = error instanceof ApiError ? error.code : null;

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen">
      <aside className="lg:w-[430px] lg:overflow-y-auto scrollbar-thin p-3 md:p-4 space-y-3 order-2 lg:order-1">
        <Glass className="p-4 space-y-3" as="section" aria-label={t('planner.title')}>
          <h1 className="font-display text-xl text-white">{t('planner.title')}</h1>
          {plan.points.map((p, i) => (
            <div key={i} className="flex items-end gap-1.5">
              <div className="flex-1 min-w-0">
                <PlaceSearch id={`pt-${i}`} label={i === 0 ? t('home.start') : i === plan.points.length - 1 ? t('home.destination') : `${t('planner.stop')} ${i}`}
                  value={p} onChange={(x) => setPoint(i, x)} onPickOnMap={() => setPickIndex(i)} allowGps={i === 0} />
              </div>
              {i > 0 && i < plan.points.length - 1 && (
                <Btn variant="chip" aria-label={`${t('common.delete')} ${t('planner.stop')} ${i}`} onClick={() => setPlan((c) => ({ ...c, points: c.points.filter((_, k) => k !== i) }))}>✕</Btn>
              )}
            </div>
          ))}
          {pickIndex !== null && <div className="text-xs text-aqua-300" role="status">⌖ {t('planner.pickHint')}</div>}
          <div className="flex flex-wrap gap-2">
            <Btn disabled={plan.points.length >= 10} onClick={() => setPlan((c) => ({ ...c, points: [...c.points.slice(0, -1), null, c.points.at(-1)!] }))}>＋ {t('planner.addStop')}</Btn>
          </div>
          <div>
            <label className="field-label" htmlFor="rtype">{t('planner.routeType')}</label>
            <select id="rtype" className="field" value={plan.type} onChange={(e) => setPlan({ type: e.target.value as typeof plan.type })}>
              {ROUTE_TYPES.map((x) => <option key={x} value={x}>{x === 'shortest' ? `${t('planner.type.standard').split(' ')[0]} — shortest` : t(`planner.type.${x}` as TKey)}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Valhalla pedestrian costing (OSM sac_scale limit, hill avoidance, path preference). Scenic routing is not offered: the backend cannot compute it.</p>
          </div>
          <Toggle checked={plan.roundTrip} onChange={(v) => setPlan({ roundTrip: v })} label={t('planner.roundTrip')} />
          <Btn variant="primary" className="w-full" onClick={calculate} disabled={busy} data-testid="calculate">{busy ? <Spinner label={t('planner.calculating')} /> : t('planner.calculate')}</Btn>
          {error != null && (errCode === 'need_points' ? <p className="text-sm text-amber-300">{t('planner.needPoints')}</p>
            : errCode === 'no_route' ? <p className="text-sm text-amber-300" role="alert">{t('planner.noRoute')}</p> : <ErrorBox error={error} onRetry={calculate} />)}
        </Glass>

        {routes.length > 0 && (
          <Glass className="p-4" as="section" aria-label={t('planner.alternatives')}>
            <h2 className="font-display text-white mb-2">{t('planner.alternatives')}</h2>
            <div className="space-y-2">
              {routes.map((r, i) => (
                <button key={r.id} onClick={() => selectRoute(r.id)} aria-pressed={selected?.id === r.id}
                  className={`w-full text-start rounded-xl border p-3 transition ${selected?.id === r.id ? 'border-aqua-400 bg-aqua-500/10' : 'border-white/10 hover:border-white/25'}`}>
                  <div className="flex justify-between text-sm"><span className="text-white">{i === 0 ? t('planner.mainLabel') : `${t('planner.altLabel')} ${i}`}</span><span className="text-aqua-300">{t(diffKey(r.difficulty))}</span></div>
                  <div className="text-xs text-slate-300 mt-1">{fmt(r.distanceKm)} km · {formatDuration(r.hikingHours)} · ↑{r.ascent} m ↓{r.descent} m</div>
                </button>
              ))}
            </div>
          </Glass>
        )}

        {selected && (
          <Glass className="p-4 space-y-3" as="section" aria-label={t('planner.details')} data-testid="route-details">
            <h2 className="font-display text-white">{t('planner.details')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t('planner.distance')} value={`${fmt(selected.distanceKm, 2)} km`} />
              <Stat label={t('planner.duration')} value={formatDuration(selected.hikingHours)} note={t('common.estimate')} />
              <Stat label={t('planner.ascent')} value={`${selected.ascent} m`} note={selected.elevationCoverage < 1 ? `${Math.round(selected.elevationCoverage * 100)}% DEM` : undefined} />
              <Stat label={t('planner.descent')} value={`${selected.descent} m`} />
              <Stat label={t('planner.minEle')} value={selected.minEle != null ? `${selected.minEle} m` : t('common.unknown')} />
              <Stat label={t('planner.maxEle')} value={selected.maxEle != null ? `${selected.maxEle} m` : t('common.unknown')} />
              <Stat label={t('planner.difficulty')} value={t(diffKey(selected.difficulty))} note={selected.maxSac != null ? `OSM sac_scale max ${selected.maxSac}` : 'sac_scale unknown'} />
              <Stat label="Valhalla" value={formatDuration(selected.valhallaTimeS / 3600)} note="routing engine time" />
            </div>
            <p className="text-[11px] text-slate-500">{t('planner.durationNote')}</p>
            <ElevationProfile samples={selected.elevation} onHover={setHoverD} />
            {selected.surfaces.length > 0 ? (
              <div>
                <div className="field-label">{t('planner.surface')}</div>
                <div className="flex flex-wrap gap-1">{selected.surfaces.slice(0, 8).map((s) => <span key={s.surface} className="badge border-white/15 text-slate-300">{s.surface} {fmt(s.km, 1)} km</span>)}</div>
              </div>
            ) : <p className="text-xs text-slate-500">{t('planner.surface')}: {t('common.unknown')}</p>}
            <p className="text-xs text-amber-200/90 border border-amber-300/20 bg-amber-500/5 rounded-lg p-2">{t('planner.safety')}</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={save} disabled={saved}>{saved ? '✓ ' + t('planner.saved') : t('planner.saveJourney')}</Btn>
              <Btn onClick={flyover}>{t('planner.flyover')}</Btn>
              <Btn onClick={async () => { if (!saved) await save(); go('cinematic'); }}>▶ {t('nav.cinematic')}</Btn>
              <Btn onClick={async () => { if (!saved) await save(); go('live'); }}>◎ {t('nav.live')}</Btn>
            </div>
            <details className="text-xs text-slate-300">
              <summary className="cursor-pointer text-slate-400">Turn-by-turn ({selected.maneuvers.length})</summary>
              <ol className="mt-2 space-y-1 list-decimal ps-5">{selected.maneuvers.map((m, i) => <li key={i}>{m.instruction} <span className="text-slate-500">({fmt(m.lengthKm, 2)} km)</span></li>)}</ol>
            </details>
          </Glass>
        )}
        {plan.points[0] && <WeatherPanel coord={plan.points[0].coord} hours={selected ? selected.hikingHours : 4} />}
        <Glass className="p-3"><AttributionList ids={['valhalla', 'nominatim', 'openfreemap', 'terrarium']} /></Glass>
      </aside>
      <div className="flex-1 order-1 lg:order-2 h-[55vh] lg:h-auto">
        <MapView className="h-full" center={plan.points[0]?.coord ?? [10.99, 47.43]} zoom={11} onReady={setEngine} />
      </div>
    </div>
  );
}
