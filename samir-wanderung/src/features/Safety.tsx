import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { Btn, Glass, Spinner } from '../ui/components';
import { WeatherPanel } from '../ui/WeatherPanel';
import { useDeviceHealth } from '../ui/useDeviceHealth';
import { emergencyFor, emergencySmsBody } from '../engines/safety/emergency';
import { KV, Regions, ActiveTracks } from '../engines/storage/db';
import { api } from '../core/api';
import type { LngLat } from '../engines/route/geo';

const DEFAULT_ITEMS = [
  { id: 'route', label: 'Route reviewed' }, { id: 'weather', label: 'Weather reviewed' }, { id: 'offline', label: 'Offline map downloaded' },
  { id: 'battery', label: 'Battery checked / power bank' }, { id: 'water', label: 'Water and food prepared' }, { id: 'clothing', label: 'Suitable clothing' },
  { id: 'footwear', label: 'Appropriate footwear' }, { id: 'emergency', label: 'Emergency information reviewed' },
];

interface Fix { lon: number; lat: number; acc: number; alt: number | null; t: number }

/** MOUNTAIN SAFETY CENTER — weather, verified-warning status, checklist, emergency information. */
export default function Safety() {
  const { t } = useI18n();
  const { activeJourney, online } = useStore();
  const health = useDeviceHealth();
  const [items, setItems] = useState(DEFAULT_ITEMS.map((x) => ({ ...x, done: false })));
  const [newItem, setNewItem] = useState('');
  const [fix, setFix] = useState<Fix | null>(null);
  const [fixErr, setFixErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [hasOffline, setHasOffline] = useState<boolean | null>(null);

  useEffect(() => {
    KV.get<typeof items>('safety.checklist').then((x) => x && setItems(x));
    KV.get<typeof contact>('safety.contact').then((x) => x && setContact(x));
    Regions.list().then((r) => setHasOffline(r.some((x) => x.complete)));
    // Last known position from an active/recovered GPS track (stays on device).
    ActiveTracks.get().then((a) => { const p = a?.points.at(-1); if (p) setFix({ lon: p.lon, lat: p.lat, acc: p.acc, alt: p.alt, t: p.t }); });
  }, []);
  const saveItems = (x: typeof items) => { setItems(x); KV.set('safety.checklist', x); };

  const locate = () => {
    setLocating(true); setFixErr(null);
    navigator.geolocation?.getCurrentPosition(async (p) => {
      const f = { lon: p.coords.longitude, lat: p.coords.latitude, acc: p.coords.accuracy, alt: p.coords.altitude, t: p.timestamp };
      setFix(f); setLocating(false);
      if (navigator.onLine) { try { const r = await api<{ countryCode: string | null }>(`/api/reverse?lon=${f.lon}&lat=${f.lat}`); setCountry(r.countryCode); } catch { /* offline */ } }
    }, (e) => { setFixErr(e.code === 1 ? t('live.denied') : t('live.unavailable')); setLocating(false); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  };

  const em = emergencyFor(country);
  const sms = fix ? emergencySmsBody({ ...fix, time: fix.t, note: contact.name ? `Contact: ${contact.name}` : undefined }) : '';
  const weatherCoord: LngLat | null = activeJourney?.route?.coords[0] ?? (fix ? [fix.lon, fix.lat] : null);

  return (
    <div className="page space-y-4">
      <h1 className="font-display text-2xl text-white">{t('safety.title')}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="p-4 space-y-3 border-red-400/30" as="section" aria-label={t('safety.emergency')} data-testid="emergency">
          <h2 className="font-display text-lg text-red-200">✚ {t('safety.emergency')}</h2>
          <p className="text-xs text-red-100/90 border border-red-400/30 rounded-lg p-2">{t('safety.noRescue')}</p>
          <div className="flex gap-2 flex-wrap"><Btn variant="primary" onClick={locate} disabled={locating}>{locating ? <Spinner /> : '◎'} {t('safety.lastPos')}</Btn></div>
          {fixErr && <p className="text-xs text-red-300">{fixErr}</p>}
          {fix ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-400">{t('safety.lastPos')}</dt><dd className="font-mono text-white select-all" dir="ltr">{fix.lat.toFixed(5)}, {fix.lon.toFixed(5)}</dd>
              <dt className="text-slate-400">{t('live.accuracy')}</dt><dd>±{Math.round(fix.acc)} m</dd>
              <dt className="text-slate-400">{t('common.updated')}</dt><dd>{new Date(fix.t).toLocaleString()}</dd>
              <dt className="text-slate-400">{t('live.altitude')}</dt><dd>{fix.alt != null ? `${Math.round(fix.alt)} m (GPS)` : t('common.unknown')}</dd>
            </dl>
          ) : <p className="text-xs text-slate-400">No position yet.</p>}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-400">{t('safety.battery')}</dt><dd>{health.battery != null ? `${Math.round(health.battery * 100)}%${health.charging ? ' (charging)' : ''}` : t('common.unknown')}</dd>
            <dt className="text-slate-400">{t('safety.connectivity')}</dt><dd>{online ? t('safety.online') : t('safety.offlineState')}</dd>
            <dt className="text-slate-400">{t('nav.offline')}</dt><dd>{hasOffline == null ? '…' : hasOffline ? '✓' : '✕'}</dd>
            <dt className="text-slate-400">{t('offline.storage')}</dt><dd>{health.storage ? `${(health.storage.usage / 1e6).toFixed(0)} / ${(health.storage.quota / 1e6).toFixed(0)} MB` : t('common.unknown')}</dd>
          </dl>
          <div>
            <div className="field-label">{t('safety.emergencyNumber')}</div>
            {em ? <div className="text-sm"><a className="text-2xl font-display text-red-200 underline" href={`tel:${em.primary}`}>{em.primary}</a>{em.extra?.map((x) => <span key={x.number} className="ms-3">{x.label}: <a className="underline" href={`tel:${x.number}`}>{x.number}</a></span>)}<div className="text-[11px] text-slate-500">{t('common.source')}: {em.source}{country ? ` · ${country.toUpperCase()}` : ''}</div></div>
              : <p className="text-xs text-slate-300">{country ? `No verified emergency number is stored for “${country.toUpperCase()}”.` : 'Locate yourself (online) to look up the country.'} 112 works on GSM networks in many countries, but verify the local number before your hike.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder={`${t('safety.contact')} name`} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} onBlur={() => KV.set('safety.contact', contact)} aria-label={t('safety.contact')} />
            <input className="field" type="tel" placeholder="+49…" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} onBlur={() => KV.set('safety.contact', contact)} aria-label="Phone" />
          </div>
          {fix && <div className="flex flex-wrap gap-2">
            {/* Opens the device's SMS app with a prepared text. Nothing is sent automatically. */}
            <a className="btn btn-danger" href={`sms:${contact.phone || (em?.primary ?? '')}?body=${encodeURIComponent(sms)}`}>{t('safety.prepareSms')}</a>
            <Btn onClick={() => navigator.share ? navigator.share({ title: 'My location', text: sms }).catch(() => {}) : navigator.clipboard?.writeText(sms)}>{t('safety.shareLocation')}</Btn>
          </div>}
          <details className="text-xs text-slate-300"><summary className="cursor-pointer">Offline emergency guidance</summary>
            <ul className="list-disc ps-5 mt-1 space-y-1">
              <li>Stay calm, ensure your own safety first. Stay where rescuers can find you if you are lost.</li>
              <li>When calling: say WHERE (coordinates above), WHAT happened, HOW MANY people, injuries, weather at the site.</li>
              <li>Keep your phone warm and in power-saving mode; keep the line free after calling.</li>
              <li>International alpine distress signal: 6 signals per minute (whistle/light), pause one minute, repeat. Reply: 3 per minute.</li>
              <li>Helicopter signal: both arms raised (Y) = “Yes, we need help”; one arm up, one down (N) = “No”.</li>
            </ul></details>
        </Glass>

        <Glass className="p-4 space-y-2" as="section" aria-label={t('safety.checklist')}>
          <h2 className="font-display text-lg text-white">{t('safety.checklist')}</h2>
          <p className="text-xs text-amber-200/80">{t('safety.advisory')}</p>
          <ul className="space-y-1">{items.map((x, i) => (
            <li key={x.id} className="flex items-center gap-2 text-sm"><input id={`c-${x.id}`} type="checkbox" checked={x.done} onChange={(e) => saveItems(items.map((y, k) => (k === i ? { ...y, done: e.target.checked } : y)))} />
              <label htmlFor={`c-${x.id}`} className="flex-1">{x.label}</label>{!DEFAULT_ITEMS.some((d) => d.id === x.id) && <button aria-label={t('common.delete')} className="text-slate-500" onClick={() => saveItems(items.filter((_, k) => k !== i))}>✕</button>}</li>))}</ul>
          <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { saveItems([...items, { id: `u${Date.now()}`, label: newItem.trim(), done: false }]); setNewItem(''); } }}>
            <input className="field" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t('safety.addItem')} aria-label={t('safety.addItem')} /><Btn type="submit" variant="chip">＋</Btn></form>
          <div className="text-xs text-slate-400">{items.filter((x) => x.done).length}/{items.length} ✓</div>
          <Btn variant="chip" onClick={() => saveItems(items.map((x) => ({ ...x, done: false })))}>↺</Btn>
        </Glass>

        <Glass className="p-4 space-y-2" as="section" aria-label={t('safety.closures')}>
          <h2 className="font-display text-lg text-white">{t('safety.closures')}</h2>
          <p className="text-sm text-slate-300">{t('safety.closuresUnavailable')}</p>
          <ul className="text-xs text-slate-400 list-disc ps-5">
            <li>Avalanche bulletins (Europe): <a className="text-aqua-300 underline" href="https://www.avalanches.org/" target="_blank" rel="noreferrer">EAWS — avalanches.org</a></li>
            <li>Weather warnings (Europe): <a className="text-aqua-300 underline" href="https://www.meteoalarm.org/" target="_blank" rel="noreferrer">MeteoAlarm</a></li>
          </ul>
          <p className="text-[11px] text-slate-500">These are links to authoritative services; SAMIR WANDERUNG does not import or summarise their warnings yet, and absence of a warning here never means absence of danger.</p>
        </Glass>
        {weatherCoord ? <WeatherPanel coord={weatherCoord} hours={activeJourney?.route?.hikingHours ?? 6} /> : <Glass className="p-4 text-sm text-slate-400">{t('weather.title')}: plan a route or locate yourself.</Glass>}
      </div>
    </div>
  );
}
