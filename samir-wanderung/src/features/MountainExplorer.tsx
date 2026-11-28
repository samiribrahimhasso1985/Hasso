import { useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { AttributionList, Btn, Empty, ErrorBox, Glass, PlaceSearch, Spinner } from '../ui/components';
import { api } from '../core/api';
import type { MapEngine } from '../engines/map/MapEngine';
import type { Place } from '../engines/route/types';

interface Peak { id: string; name: string; lon: number; lat: number; ele: number | null; wikidata: string | null }

/** Real peaks from OpenStreetMap (natural=peak) in the current view, over 3D DEM terrain. */
export default function MountainExplorer() {
  const { t } = useI18n();
  const { setPlan, go, focus } = useStore();
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [peaks, setPeaks] = useState<Peak[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [place, setPlace] = useState<Place | null>(null);

  const load = async () => {
    if (!engine) return;
    const [w, s, e, n] = engine.bounds();
    setBusy(true); setErr(null);
    try {
      const area = (e - w) * (n - s);
      const k = area > 0.9 ? Math.sqrt(0.9 / area) : 1; // shrink to the allowed bbox around the centre
      const cx = (w + e) / 2, cy = (s + n) / 2;
      const r = await api<{ peaks: Peak[] }>(`/api/peaks?west=${cx - ((e - w) / 2) * k}&south=${cy - ((n - s) / 2) * k}&east=${cx + ((e - w) / 2) * k}&north=${cy + ((n - s) / 2) * k}`);
      setPeaks(r.peaks);
      engine.clearMarkers();
      r.peaks.slice(0, 40).forEach((p) => engine.addMarker([p.lon, p.lat], 'poi', `▲ ${p.name}${p.ele ? ` ${Math.round(p.ele)}` : ''}`));
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen">
      <aside className="lg:w-[380px] p-3 md:p-4 space-y-3 order-2 lg:order-1 lg:overflow-y-auto scrollbar-thin">
        <Glass className="p-4 space-y-3">
          <h1 className="font-display text-xl text-white">{t('mountain.title')}</h1>
          <PlaceSearch id="mtn-search" label={t('common.search')} value={place} onChange={(p) => { setPlace(p); if (p) engine?.flyTo(p.coord, 12.5); }} allowGps={false} />
          <Btn variant="primary" onClick={load} disabled={busy || !engine}>{busy ? <Spinner /> : t('mountain.load')}</Btn>
          {err != null && <ErrorBox error={err} onRetry={load} />}
        </Glass>
        {peaks && (
          <Glass className="p-4">
            <h2 className="font-display text-white mb-2">{t('mountain.peaks')} ({peaks.length})</h2>
            {peaks.length === 0 ? <Empty>{t('mountain.none')}</Empty> : (
              <ul className="divide-y divide-white/5 max-h-[50vh] overflow-auto scrollbar-thin">
                {peaks.map((p) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                    <button className="text-start min-w-0" onClick={() => engine?.flyTo([p.lon, p.lat], 14, { pitch: 70 })}>
                      <div className="text-sm text-white truncate">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.ele != null ? `${Math.round(p.ele)} m (OSM ele)` : t('common.unknown')} · <a className="hover:text-aqua-300" href={`https://www.openstreetmap.org/${p.id}`} target="_blank" rel="noreferrer">OSM</a></div>
                    </button>
                    <Btn variant="chip" onClick={() => { setPlan((c) => { const pts = [...c.points]; pts[pts.length - 1] = { name: p.name, coord: [p.lon, p.lat], origin: 'atlas' }; return { ...c, points: pts }; }); go('planner'); }}>⇢</Btn>
                  </li>
                ))}
              </ul>
            )}
          </Glass>
        )}
        <Glass className="p-3"><AttributionList ids={['overpass', 'openfreemap', 'terrarium']} /></Glass>
      </aside>
      <div className="lg:flex-1 shrink-0 order-1 lg:order-2 h-[55vh] lg:h-auto"><MapView className="h-full" center={focus?.coord ?? [7.66, 45.98]} zoom={12} pitch={65} onReady={setEngine} /></div>
    </div>
  );
}
