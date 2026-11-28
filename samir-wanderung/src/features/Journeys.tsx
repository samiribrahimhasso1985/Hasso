import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { Btn, Empty, Glass, PageHeader, Stat } from '../ui/components';
import { Journeys as JStore, Photos, onJourneysChanged, uid, type PhotoRecord } from '../engines/storage/db';
import { download, toGPX } from '../engines/gps/gpx';
import { cumulativeDistances } from '../engines/route/geo';
import { formatDuration } from '../engines/route/stats';
import type { Journey } from '../engines/route/types';

export default function Journeys() {
  const { t, fmt } = useI18n();
  const { setActiveJourney, go, setPlan, setRoutes, selectRoute } = useStore();
  const [list, setList] = useState<Journey[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const l = () => JStore.list().then(setList); l(); return onJourneysChanged(l); }, []);

  return (
    <div className="page">
      <PageHeader title={t('journeys.title')}><span className="text-xs text-slate-400 self-center">🔒 {t('journeys.private')}</span></PageHeader>
      {list.length === 0 ? <Glass className="p-6"><Empty>{t('journeys.empty')}</Empty></Glass> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((j) => {
            const trackKm = j.track && j.track.length > 1 ? cumulativeDistances(j.track.map((p) => [p.lon, p.lat])).at(-1)! / 1000 : null;
            return (
              <Glass key={j.id} className="p-4 space-y-2" as="section">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0"><h2 className="text-white truncate">{j.name}</h2><div className="text-xs text-slate-400">{j.kind === 'planned' ? t('journeys.planned') : t('journeys.recorded')} · {new Date(j.createdAt).toLocaleString()}</div></div>
                  <span className={`badge self-start ${j.kind === 'recorded' ? 'badge-live' : 'badge-sim'}`}>{j.kind}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {j.route && <><Stat label={t('planner.distance')} value={`${fmt(j.route.distanceKm)} km`} /><Stat label={t('planner.ascent')} value={`${j.route.ascent} m`} /><Stat label={t('planner.duration')} value={formatDuration(j.route.hikingHours)} /></>}
                  {trackKm != null && <><Stat label={t('live.recorded')} value={`${fmt(trackKm, 2)} km`} /><Stat label={t('live.points')} value={j.track!.length} /><Stat label="⏱" value={formatDuration((j.track!.at(-1)!.t - j.track![0].t) / 3600_000)} /></>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {j.route && <Btn variant="primary" onClick={() => { setActiveJourney(j); go('cinematic'); }}>▶ {t('journeys.animate')}</Btn>}
                  {j.route && j.request && <Btn onClick={() => { setPlan({ points: j.request!.points, type: j.request!.type, roundTrip: j.request!.roundTrip }); setRoutes([j.route!]); selectRoute(j.route!.id); go('planner'); }}>{t('journeys.open')}</Btn>}
                  {j.route && <Btn onClick={() => { setActiveJourney(j); go('live'); }}>◎</Btn>}
                  <Btn onClick={() => download(`${j.name.replace(/[^\w-]+/g, '_')}.gpx`, toGPX({ name: j.name, track: j.track, route: j.route?.coords }), 'application/gpx+xml')}>GPX</Btn>
                  <Btn onClick={() => setOpen(open === j.id ? null : j.id)} aria-expanded={open === j.id}>{t('journeys.memories')}</Btn>
                  <Btn variant="danger" onClick={() => confirm(`${t('common.delete')}: ${j.name}?`) && JStore.remove(j.id)}>{t('common.delete')}</Btn>
                </div>
                {open === j.id && <Memories journey={j} />}
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Photos, notes, visited places and an exportable summary — private and on-device only. */
function Memories({ journey }: { journey: Journey }) {
  const { t, fmt } = useI18n();
  const [photos, setPhotos] = useState<(PhotoRecord & { url: string })[]>([]);
  const [notes, setNotes] = useState(journey.notes ?? '');
  useEffect(() => {
    let urls: string[] = [];
    Photos.forJourney(journey.id).then((p) => { const x = p.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) })); urls = x.map((r) => r.url); setPhotos(x); });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [journey.id]);

  const add = async (files: FileList) => {
    for (const f of [...files].slice(0, 20)) {
      if (!f.type.startsWith('image/')) continue;
      const rec: PhotoRecord = { id: uid('ph'), journeyId: journey.id, blob: f, name: f.name, takenAt: new Date(f.lastModified).toISOString() };
      await Photos.add(rec); setPhotos((p) => [...p, { ...rec, url: URL.createObjectURL(f) }]);
    }
  };
  const saveNotes = () => JStore.put({ ...journey, notes });

  const exportSummary = async () => {
    const imgs = await Promise.all(photos.map((p) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(p.blob); })));
    const r = journey.route;
    const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(journey.name)}</title><style>body{font-family:system-ui;background:#0b0f12;color:#e2e8f0;max-width:900px;margin:auto;padding:24px}h1{color:#14d3c8}img{max-width:100%;border-radius:12px;margin:8px 0}</style>
<h1>${escapeHtml(journey.name)}</h1><p>${new Date(journey.createdAt).toLocaleString()}</p>
${r ? `<p>${fmt(r.distanceKm, 2)} km · ↑${r.ascent} m · ↓${r.descent} m · max ${r.maxEle ?? '?'} m · ${formatDuration(r.hikingHours)} (estimate)</p>` : ''}
<p style="white-space:pre-wrap">${escapeHtml(notes)}</p>${imgs.map((s) => `<img src="${s}">`).join('')}
<p style="font-size:11px;color:#64748b">SSBN · Map data © OpenStreetMap contributors</p>`;
    download(`${journey.name.replace(/[^\w-]+/g, '_')}-memories.html`, html, 'text/html');
  };

  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <label className="field-label" htmlFor={`n-${journey.id}`}>{t('journeys.notes')}</label>
      <textarea id={`n-${journey.id}`} className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-ghost cursor-pointer">{t('journeys.addPhotos')}<input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && add(e.target.files)} /></label>
        <Btn onClick={exportSummary}>{t('journeys.exportMemories')}</Btn>
      </div>
      {photos.length > 0 && <div className="grid grid-cols-4 gap-1">{photos.map((p) => (
        <div key={p.id} className="relative group"><img src={p.url} alt={p.name} className="aspect-square object-cover rounded-lg" />
          <button className="absolute top-1 end-1 btn btn-chip text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={t('common.delete')} onClick={() => { Photos.remove(p.id); setPhotos((x) => x.filter((y) => y.id !== p.id)); }}>✕</button></div>))}</div>}
      {journey.request && <div className="text-xs text-slate-400">{journey.request.points.map((p) => p.name).join(' → ')}</div>}
    </div>
  );
}

const escapeHtml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
