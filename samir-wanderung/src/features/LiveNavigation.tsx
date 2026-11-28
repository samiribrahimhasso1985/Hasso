import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { Btn, ErrorBox, Glass, Stat, ElevationProfile } from '../ui/components';
import { GPSEngine, DEFAULT_GPS, BATTERY_SAVER_GPS, type GPSState } from '../engines/gps/GPSEngine';
import { distanceToLine, type LngLat } from '../engines/route/geo';
import { rerouteFrom } from '../engines/route/RouteEngine';
import { ActiveTracks, Journeys, uid } from '../engines/storage/db';
import { download, parseGPX, toGPX } from '../engines/gps/gpx';
import type { MapEngine } from '../engines/map/MapEngine';
import type { Journey, Route } from '../engines/route/types';
import maplibregl from 'maplibre-gl';
import { useDeviceHealth } from '../ui/useDeviceHealth';

const OFF_ROUTE_M = 50;

/**
 * Live GPS navigation — uses only the device's real position. Clearly separated from the
 * cinematic simulation. Tracking runs while the page is open (browsers stop GPS for
 * background tabs; background tracking would require a native app).
 */
export default function LiveNavigation() {
  const { t, fmt } = useI18n();
  const { activeJourney, setActiveJourney, settings, go, online } = useStore();
  const gps = useMemo(() => new GPSEngine(settings.batterySaver ? BATTERY_SAVER_GPS : DEFAULT_GPS), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [st, setSt] = useState<GPSState>(gps.state);
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [planned, setPlanned] = useState<Route | null>(activeJourney?.route ?? null);
  const [offCount, setOffCount] = useState(0);
  const [rerouteErr, setRerouteErr] = useState<unknown>(null);
  const [rerouting, setRerouting] = useState(false);
  const [recovered, setRecovered] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);
  const me = useRef<maplibregl.Marker | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const health = useDeviceHealth();

  useEffect(() => gps.subscribe(setSt), [gps]);
  useEffect(() => { gps.setSettings(settings.batterySaver ? BATTERY_SAVER_GPS : DEFAULT_GPS); }, [gps, settings.batterySaver]);
  useEffect(() => {
    gps.onPersist = (pts) => { ActiveTracks.append(pts, gps.state.startedAt ?? Date.now(), activeJourney?.id).catch(() => {}); };
    ActiveTracks.get().then((a) => { if (a?.points.length) setRecovered(a.points.length); }).catch(() => {});
    return () => { gps.stop(); wake.current?.release().catch(() => {}); };
  }, [gps, activeJourney?.id]);

  useEffect(() => { if (engine && planned) { engine.setRoutes([planned], planned.id); engine.clearMarkers(); engine.addMarker(planned.coords[0], 'start', 'A'); engine.addMarker(planned.coords.at(-1)!, 'end', 'B'); engine.fitLine(planned.coords, { duration: 0 }); } }, [engine, planned]);

  // Position marker, recorded track, follow camera.
  useEffect(() => {
    if (!engine || !st.position) return;
    const c: LngLat = [st.position.lon, st.position.lat];
    if (!me.current) { const el = document.createElement('div'); el.className = 'sw-marker sw-marker-me'; el.setAttribute('aria-label', 'GPS'); me.current = new maplibregl.Marker({ element: el }).setLngLat(c).addTo(engine.map); }
    else me.current.setLngLat(c);
    engine.setTrack(st.track.map((p) => [p.lon, p.lat]));
    if (follow) engine.map.easeTo({ center: c, duration: settings.reducedMotion ? 0 : 800, zoom: Math.max(engine.map.getZoom(), 15) });
  }, [engine, st.position, st.track, follow, settings.reducedMotion]);
  useEffect(() => () => { me.current?.remove(); }, []);

  const deviation = useMemo(() => planned && st.position ? distanceToLine([st.position.lon, st.position.lat], planned.coords, planned.cum) : null, [planned, st.position]);
  useEffect(() => { if (!deviation || !st.position) return; setOffCount((c) => (deviation.distance > Math.max(OFF_ROUTE_M, st.position!.acc) ? c + 1 : 0)); }, [deviation, st.position]);
  const offRoute = offCount >= 3; // require 3 consecutive fixes to avoid false alarms from GPS jitter

  const start = async (resume = false) => {
    let prev;
    if (resume) prev = (await ActiveTracks.get())?.points;
    else await ActiveTracks.clear();
    setRecovered(null);
    gps.start(prev);
    try { wake.current = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  };

  const stop = async () => {
    const track = gps.stop();
    wake.current?.release().catch(() => {}); wake.current = null;
    if (track.length >= 2) {
      const j: Journey = { id: uid('j'), kind: 'recorded', name: `${t('journeys.recorded')} ${new Date().toLocaleString()}`, createdAt: new Date().toISOString(), track, request: activeJourney?.request };
      await Journeys.put(j);
    }
    await ActiveTracks.clear();
  };

  const reroute = async () => {
    if (!st.position || !activeJourney?.request) return;
    setRerouting(true); setRerouteErr(null);
    try {
      const dest = activeJourney.request.points.at(-1)!;
      const r = await rerouteFrom([st.position.lon, st.position.lat], dest, activeJourney.request.type);
      setPlanned(r); setOffCount(0);
    } catch (e) { setRerouteErr(e); } finally { setRerouting(false); }
  };

  const importGpx = async (f: File) => {
    const g = parseGPX(await f.text());
    const pts = g.route.length ? g.route : g.track.map((p) => [p.lon, p.lat] as LngLat);
    if (pts.length < 2) return;
    // Imported geometry is shown as a reference line only (not re-routed).
    const { cumulativeDistances } = await import('../engines/route/geo');
    const cum = cumulativeDistances(pts);
    const r: Route = { id: uid('gpx'), label: 'main', coords: pts, cum, distanceKm: cum.at(-1)! / 1000, valhallaTimeS: 0, elevation: g.track.map((p, i) => ({ d: cum[i] ?? 0, h: p.alt })), ascent: 0, descent: 0, minEle: null, maxEle: null, elevationCoverage: 0, hikingHours: 0, difficulty: 'moderate', maxSac: null, surfaces: [], waypointDistances: [0, cum.at(-1)!], maneuvers: [], provider: 'valhalla', computedAt: new Date().toISOString() };
    setPlanned(r);
    await Journeys.put({ id: uid('j'), kind: g.track.length ? 'recorded' : 'planned', name: g.name ?? f.name, createdAt: new Date().toISOString(), track: g.track.length ? g.track : undefined, route: g.track.length ? undefined : r });
  };

  const exportGpx = () => download(`ssbn-${Date.now()}.gpx`, toGPX({ name: activeJourney?.name ?? 'Track', track: st.track, route: planned?.coords }), 'application/gpx+xml');

  const remaining = planned && deviation ? (planned.cum.at(-1)! - deviation.along) / 1000 : null;
  const tracking = st.status === 'tracking' || st.status === 'requesting';

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen">
      <aside className="lg:w-[400px] p-3 md:p-4 space-y-3 order-2 lg:order-1 lg:overflow-y-auto scrollbar-thin">
        <Glass className="p-4 space-y-3">
          <div className="flex items-center gap-2"><h1 className="font-display text-xl text-white">{t('live.title')}</h1><span className="badge badge-live">LIVE GPS</span></div>
          {!GPSEngine.available() && <p className="text-sm text-red-300">{t('live.unavailable')}</p>}
          <p className="text-xs text-slate-400">{t('live.permission')}</p>
          {!online && <p className="text-xs text-amber-300" role="status">{t('live.offline')}</p>}
          {recovered && st.status === 'idle' && (
            <div className="text-xs text-aqua-200 border border-aqua-400/30 rounded-lg p-2">Unsaved track found ({recovered} {t('live.points')}). <Btn variant="chip" onClick={() => start(true)}>{t('live.resume')}</Btn></div>
          )}
          <div className="flex flex-wrap gap-2">
            {st.status === 'idle' || st.status === 'denied' || st.status === 'unavailable' ? <Btn variant="primary" onClick={() => start(false)} data-testid="gps-start">{t('live.start')}</Btn> : null}
            {tracking && <Btn onClick={() => gps.pause()}>{t('live.pause')}</Btn>}
            {st.status === 'paused' && <Btn variant="primary" onClick={() => gps.resume()}>{t('live.resume')}</Btn>}
            {st.status !== 'idle' && <Btn variant="danger" onClick={stop}>{t('live.stop')}</Btn>}
            <Btn onClick={() => go('safety')}>✚ {t('live.checklist')}</Btn>
          </div>
          <div className="text-xs" role="status" data-testid="gps-status">
            {st.status === 'requesting' && <span className="text-aqua-300">{t('live.waiting')}</span>}
            {st.status === 'denied' && <span className="text-red-300">{t('live.denied')}</span>}
            {st.status === 'paused' && <span className="text-amber-300">⏸ {t('live.pause')}</span>}
            {st.error && st.status === 'tracking' && <span className="text-amber-300"> {st.error}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t('live.recorded')} value={`${fmt(st.distanceM / 1000, 2)} km`} note={`${st.track.length} ${t('live.points')}`} />
            <Stat label={t('live.accuracy')} value={st.position ? `±${Math.round(st.position.acc)} m` : '–'} />
            <Stat label={t('live.altitude')} value={st.position?.alt != null ? `${Math.round(st.position.alt)} m` : t('common.unknown')} note="GPS" />
            <Stat label={t('live.speed')} value={st.position?.speed != null ? `${fmt(st.position.speed * 3.6)} km/h` : '–'} />
            {remaining != null && <Stat label={t('cine.remaining')} value={`${fmt(Math.max(0, remaining), 2)} km`} />}
            <Stat label={t('safety.battery')} value={health.battery != null ? `${Math.round(health.battery * 100)}%${health.charging ? ' ⚡' : ''}` : t('common.unknown')} />
          </div>
          {planned ? (deviation && st.position && (offRoute ? (
            <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-2 text-sm text-orange-200" role="alert" data-testid="off-route">
              ⚠ {t('live.offRoute')} ({Math.round(deviation.distance)} m)
              <div className="mt-2 flex gap-2">
                {online && activeJourney?.request ? <Btn variant="chip" onClick={reroute} disabled={rerouting}>{t('live.reroute')}</Btn>
                  : <span className="text-xs">{online ? 'Imported routes cannot be re-routed.' : 'Offline rerouting is unavailable: return to the downloaded route or use another reliable navigation method.'}</span>}
              </div>
              {rerouteErr != null && <ErrorBox error={rerouteErr} />}
            </div>
          ) : <p className="text-xs text-aqua-300">✓ {t('live.planned')} ({Math.round(deviation.distance)} m)</p>)) : <p className="text-xs text-slate-400">{t('live.noPlan')}</p>}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Follow position</label>
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-ghost cursor-pointer">{t('live.importGpx')}<input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && importGpx(e.target.files[0])} /></label>
            <Btn onClick={exportGpx} disabled={!st.track.length && !planned}>{t('live.exportGpx')}</Btn>
            {activeJourney && <Btn onClick={() => { setActiveJourney(null); setPlanned(null); }}>✕ {activeJourney.name.slice(0, 20)}</Btn>}
          </div>
          <p className="text-[11px] text-slate-500">GPS works while this page is open and the screen is on (Screen Wake Lock requested when supported). Background tracking with the screen off is not available in a web app.</p>
        </Glass>
        {planned && planned.elevation.some((e) => e.h != null) && <Glass className="p-3"><ElevationProfile samples={planned.elevation} marker={deviation?.along ?? null} /></Glass>}
      </aside>
      <div className="lg:flex-1 shrink-0 order-1 lg:order-2 h-[55vh] lg:h-auto"><MapView className="h-full" onReady={setEngine} zoom={12} pitch={45} /></div>
    </div>
  );
}
