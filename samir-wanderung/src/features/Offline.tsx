import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { MapView } from '../ui/MapView';
import { Btn, Empty, ErrorBox, Glass, Spinner } from '../ui/components';
import { checkIntegrity, deleteRegion, downloadRegion, estimateRegion, type DownloadProgress } from '../engines/offline/OfflineEngine';
import { Journeys, Regions, storageEstimate, type OfflineRegion } from '../engines/storage/db';
import type { MapEngine } from '../engines/map/MapEngine';
import type { Journey } from '../engines/route/types';

export default function Offline() {
  const { t } = useI18n();
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [routes, setRoutes] = useState<Journey[]>([]);
  const [prog, setProg] = useState<DownloadProgress | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [est, setEst] = useState<{ tiles: number; tooBig: boolean } | null>(null);
  const [maxZoom, setMaxZoom] = useState(14);
  const [storage, setStorage] = useState<{ usage: number | null; quota: number | null; persisted: boolean } | null>(null);
  const [integrity, setIntegrity] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);

  const refresh = async () => { setRegions(await Regions.list()); setRoutes((await Journeys.list()).filter((j) => j.route)); setStorage(await storageEstimate()); };
  useEffect(() => { refresh(); return () => abort.current?.abort(); }, []);
  useEffect(() => {
    if (!engine) return;
    const upd = () => { const z = Math.floor(engine.map.getZoom()); setEst(estimateRegion(engine.bounds(), Math.max(0, z - 4), maxZoom)); };
    upd(); engine.map.on('moveend', upd); return () => { engine.map.off('moveend', upd); };
  }, [engine, maxZoom]);

  const start = async (resume?: OfflineRegion) => {
    if (!engine) return;
    setErr(null); abort.current = new AbortController();
    try {
      await navigator.storage?.persist?.(); // ask the browser not to evict offline data
      const bbox = resume?.bbox ?? engine.bounds();
      const z = Math.floor(engine.map.getZoom());
      await downloadRegion({ name: resume?.name ?? `Region ${new Date().toLocaleString()}`, bbox, minZoom: resume?.minZoom ?? Math.max(0, z - 4), maxZoom: resume?.maxZoom ?? maxZoom, signal: abort.current.signal, onProgress: setProg, resumeId: resume?.id });
    } catch (e) { setErr((e as DOMException).name === 'QuotaExceededError' ? new Error('storage_full') : e); }
    finally { setProg(null); refresh(); }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen">
      <aside className="lg:w-[420px] p-3 md:p-4 space-y-3 order-2 lg:order-1 lg:overflow-y-auto scrollbar-thin">
        <Glass className="p-4 space-y-2">
          <h1 className="font-display text-xl text-white">{t('offline.title')}</h1>
          <p className="text-[11px] text-slate-400">{t('offline.policy')}</p>
          <label className="text-xs flex items-center gap-2">Max zoom <select className="field w-auto" value={maxZoom} onChange={(e) => setMaxZoom(+e.target.value)}>{[12, 13, 14].map((z) => <option key={z}>{z}</option>)}</select></label>
          {est && <p className={`text-xs ${est.tooBig ? 'text-red-300' : 'text-slate-300'}`}>{est.tiles} tiles{est.tooBig ? ` — ${t('offline.tooBig')}` : ''}</p>}
          <div className="flex gap-2">
            <Btn variant="primary" onClick={() => start()} disabled={!engine || !!prog || !!est?.tooBig}>⇣ {t('offline.download')}</Btn>
            {prog && <Btn variant="danger" onClick={() => abort.current?.abort()}>{t('common.cancel')}</Btn>}
          </div>
          {prog && <div><div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-aqua-400" style={{ width: `${(prog.done / prog.total) * 100}%` }} /></div><p className="text-xs text-slate-300 mt-1" data-testid="dl-progress">{t('offline.progress')} {prog.done}/{prog.total} · {(prog.bytes / 1e6).toFixed(1)} MB{prog.failed ? ` · ${prog.failed} failed` : ''}</p></div>}
          {err != null && <ErrorBox error={err} />}
          {storage && <p className="text-xs text-slate-400">{t('offline.storage')}: {storage.usage != null ? `${(storage.usage / 1e6).toFixed(1)} MB` : '?'} / {storage.quota != null ? `${(storage.quota / 1e9).toFixed(1)} GB` : '?'} · persistent: {storage.persisted ? 'yes' : 'no'}</p>}
        </Glass>
        <Glass className="p-4">
          <h2 className="font-display text-white mb-2">{t('offline.regions')}</h2>
          {regions.length === 0 ? <Empty>{t('common.empty')}</Empty> : <ul className="divide-y divide-white/5">{regions.map((r) => (
            <li key={r.id} className="py-2 text-sm space-y-1">
              <div className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="text-xs text-slate-400">{(r.bytes / 1e6).toFixed(1)} MB · z{r.minZoom}-{r.maxZoom}</span></div>
              <div className="text-xs">{r.complete ? <span className="text-aqua-300">✓ complete</span> : <span className="text-amber-300">interrupted</span>}{r.failed ? ` · ${r.failed} failed` : ''} {integrity[r.id] && ` · ${integrity[r.id]}`}</div>
              <div className="flex gap-1">
                <Btn variant="chip" onClick={() => engine?.map.fitBounds([[r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]])}>⌖</Btn>
                {!r.complete && <Btn variant="chip" onClick={() => start(r)} disabled={!!prog}>resume</Btn>}
                <Btn variant="chip" onClick={async () => { const x = await checkIntegrity(r); setIntegrity((s) => ({ ...s, [r.id]: `${x.present}/${x.present + x.missing} cached` })); }}>{t('offline.integrity')}</Btn>
                <Btn variant="chip" onClick={async () => { if (confirm(`${t('common.delete')} ${r.name}? (journeys are kept)`)) { await deleteRegion(r); refresh(); } }}>✕</Btn>
              </div>
            </li>))}</ul>}
        </Glass>
        <Glass className="p-4">
          <h2 className="font-display text-white mb-2">{t('offline.routes')}</h2>
          {routes.length === 0 ? <Empty>{t('journeys.empty')}</Empty> : <ul className="text-sm space-y-1">{routes.map((j) => <li key={j.id} className="flex justify-between gap-2"><span className="truncate">{j.name}</span><Btn variant="chip" onClick={() => engine?.fitLine(j.route!.coords)}>⌖</Btn></li>)}</ul>}
          <p className="text-[11px] text-slate-500 mt-2">Route geometry and elevation profiles are stored locally in IndexedDB and are available offline. Offline rerouting is not available.</p>
        </Glass>
      </aside>
      <div className="flex-1 order-1 lg:order-2 h-[50vh] lg:h-auto">{engine === undefined ? <Spinner /> : <MapView className="h-full" zoom={12} pitch={0} onReady={setEngine} />}</div>
    </div>
  );
}
