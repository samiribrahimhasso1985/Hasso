import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import { useI18n, type TKey } from '../core/i18n';
import { useStore } from '../core/store';
import { MapView } from '../ui/MapView';
import { AttributionList, Btn, Empty, ErrorBox, Glass, Spinner } from '../ui/components';
import { WeatherPanel } from '../ui/WeatherPanel';
import { api } from '../core/api';
import { Destinations, KV } from '../engines/storage/db';
import { COUNTRIES, CONTINENT_OF } from '../engines/atlas/countries';
import type { MapEngine } from '../engines/map/MapEngine';

export interface AtlasItem { id: string; name: string; originalName: string | null; lon: number; lat: number; elevation: number | null; country: string | null; description: string | null; image: string | null; website: string | null; article: string | null; category: string; source: string }
interface Trail { id: string; name: string | null; ref: string | null; network: string | null; distance: string | null; operator: string | null; website: string | null; center: [number, number] | null; from: string | null; to: string | null }

const CATS = ['mountain', 'range', 'lake', 'waterfall', 'forest', 'nationalPark', 'reserve', 'valley', 'glacier', 'canyon'] as const;
const CONTINENTS = ['europe', 'asia', 'africa', 'namerica', 'samerica', 'oceania', 'antarctica'] as const;
const CONT_LABEL: Record<string, string> = { europe: 'Europe', asia: 'Asia', africa: 'Africa', namerica: 'North America', samerica: 'South America', oceania: 'Oceania', antarctica: 'Antarctica' };
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

/**
 * World Nature Atlas: real destinations from Wikidata (every item links to its Wikidata record),
 * clustered on a world map, with nearby OSM hiking-route relations, weather and seasonal notes.
 */
export default function Atlas() {
  const { t, lang } = useI18n();
  const { param, go } = useStore();
  const [cat, setCat] = useState<(typeof CATS)[number]>('mountain');
  const [continent, setContinent] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [items, setItems] = useState<AtlasItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [detail, setDetail] = useState<AtlasItem | null>(null);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { Destinations.list().then((d) => setSaved(d.map((x) => ({ id: x.id, name: x.name })))); KV.get<string[]>('atlas.recent').then((r) => setRecent(r ?? [])); }, []);

  const load = async (reset: boolean) => {
    setBusy(true); setErr(null);
    const off = reset ? 0 : offset;
    try {
      const r = await api<{ items: AtlasItem[] }>(`/api/atlas?category=${cat}&lang=${lang}&offset=${off}&limit=30${country ? `&country=${country}` : ''}`);
      setItems((cur) => { const all = reset ? r.items : [...cur, ...r.items]; const seen = new Set<string>(); return all.filter((x) => !seen.has(x.id) && seen.add(x.id)); });
      setOffset(off + 30);
      const key = `${cat}${country ? ' · ' + (COUNTRIES.find((c) => c.q === country)?.name ?? country) : ''}`;
      const nr = [key, ...recent.filter((x) => x !== key)].slice(0, 8); setRecent(nr); KV.set('atlas.recent', nr);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  useEffect(() => { load(true); }, [cat, country, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clustered markers (GeoJSON source with clustering).
  useEffect(() => {
    if (!engine) return;
    const m = engine.map;
    if (!m.getSource('atlas')) {
      m.addSource('atlas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 45, clusterMaxZoom: 9 });
      m.addLayer({ id: 'atlas-cluster', type: 'circle', source: 'atlas', filter: ['has', 'point_count'], paint: { 'circle-color': '#14d3c8', 'circle-opacity': 0.75, 'circle-radius': ['step', ['get', 'point_count'], 14, 10, 20, 30, 26], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
      m.addLayer({ id: 'atlas-count', type: 'symbol', source: 'atlas', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#07090b' } });
      m.addLayer({ id: 'atlas-pt', type: 'circle', source: 'atlas', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#38d9ff', 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
      m.addLayer({ id: 'atlas-label', type: 'symbol', source: 'atlas', filter: ['!', ['has', 'point_count']], minzoom: 4, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#e2fffd', 'text-halo-color': '#0b0f12', 'text-halo-width': 1.2 } });
      m.on('click', 'atlas-cluster', async (e) => {
        const f = e.features?.[0]; if (!f) return;
        const z = await (m.getSource('atlas') as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);
        m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z });
      });
      m.on('click', 'atlas-pt', (e) => { const id = e.features?.[0]?.properties.id; const it = itemsRef.current.find((x) => x.id === id); if (it) setDetail(it); });
      for (const l of ['atlas-cluster', 'atlas-pt']) { m.on('mouseenter', l, () => (m.getCanvas().style.cursor = 'pointer')); m.on('mouseleave', l, () => (m.getCanvas().style.cursor = '')); }
    }
    (m.getSource('atlas') as GeoJSONSource).setData({ type: 'FeatureCollection', features: items.map((i) => ({ type: 'Feature', properties: { id: i.id, name: i.name }, geometry: { type: 'Point', coordinates: [i.lon, i.lat] } })) });
  }, [engine, items]);
  const itemsRef = useRef(items); itemsRef.current = items;

  useEffect(() => { if (engine && detail) engine.flyTo([detail.lon, detail.lat], 11, { pitch: 55 }); }, [engine, detail]);
  useEffect(() => { if (param && items.length) { const it = items.find((x) => x.id === param); if (it) setDetail(it); } }, [param, items]);

  const countries = COUNTRIES.filter((c) => !continent || CONTINENT_OF[c.q] === continent);
  const shown = items.filter((i) => !filter || (i.name + ' ' + (i.originalName ?? '') + ' ' + (i.country ?? '')).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen">
      <aside className="lg:w-[440px] p-3 md:p-4 space-y-3 order-2 lg:order-1 lg:overflow-y-auto scrollbar-thin">
        {detail ? <DestinationDetail item={detail} onBack={() => { setDetail(null); go('atlas'); }} onSaved={(s) => setSaved(s)} /> : (
          <>
            <Glass className="p-4 space-y-3">
              <h1 className="font-display text-xl text-white">{t('atlas.title')}</h1>
              <div className="flex flex-wrap gap-1" role="group" aria-label={t('atlas.category')}>
                {CATS.map((c) => <button key={c} className={`btn btn-chip text-xs ${cat === c ? 'is-active' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{t(`atlas.cat.${c}` as TKey)}</button>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="field-label" htmlFor="cont">{t('atlas.continent')}</label>
                  <select id="cont" className="field" value={continent} onChange={(e) => { setContinent(e.target.value); setCountry(''); if (engine) { const c = { europe: [15, 52, 3], asia: [90, 40, 2], africa: [20, 3, 2.3], namerica: [-100, 45, 2.2], samerica: [-60, -15, 2.3], oceania: [140, -25, 2.6], antarctica: [0, -80, 2] }[e.target.value] as number[] | undefined; if (c) engine.map.flyTo({ center: [c[0], c[1]], zoom: c[2], pitch: 0 }); } }}>
                    <option value="">—</option>{CONTINENTS.map((c) => <option key={c} value={c}>{CONT_LABEL[c]}</option>)}</select></div>
                <div><label className="field-label" htmlFor="ctry">{t('atlas.country')}</label>
                  <select id="ctry" className="field" value={country} onChange={(e) => setCountry(e.target.value)}><option value="">—</option>{countries.map((c) => <option key={c.q} value={c.q}>{c.name}</option>)}</select></div>
              </div>
              {continent === 'antarctica' && <p className="text-xs text-amber-200">Antarctica is shown for geographic discovery only. Access is governed by the Antarctic Treaty system and is not a hiking destination.</p>}
              <input className="field" placeholder={t('common.search')} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('common.search')} />
              {recent.length > 0 && <div className="text-[11px] text-slate-400">{t('atlas.recentSearches')}: {recent.join(' · ')}</div>}
              {saved.length > 0 && <div className="text-[11px] text-slate-400">{t('atlas.saved')}: {saved.map((s) => <button key={s.id} className="underline me-2 hover:text-aqua-300" onClick={() => { const it = items.find((x) => x.id === s.id); if (it) setDetail(it); else go('world', s.id); }}>{s.name}</button>)}</div>}
              <p className="text-[11px] text-slate-500">{t('atlas.coverage')} Ranked by number of Wikipedia sitelinks.</p>
            </Glass>
            {err != null && <ErrorBox error={err} onRetry={() => load(true)} />}
            <Glass className="p-2">
              {busy && items.length === 0 ? <div className="p-4"><Spinner label={`${t('common.loading')} Wikidata… (live queries can take up to a minute)`} /></div> : shown.length === 0 ? <Empty>{t('common.empty')}</Empty> : (
                <ul className="divide-y divide-white/5" data-testid="atlas-list">
                  {shown.map((i) => (
                    <li key={i.id}><button className="w-full text-start p-2 hover:bg-white/5 rounded-lg flex gap-3" onClick={() => setDetail(i)}>
                      {i.image ? <img loading="lazy" src={thumb(i.image, 120)} alt="" className="w-14 h-14 rounded-lg object-cover bg-ink-700 shrink-0" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} /> : <div className="w-14 h-14 rounded-lg bg-ink-700 shrink-0" />}
                      <div className="min-w-0"><div className="text-sm text-white truncate">{i.name}{i.originalName && i.originalName !== i.name && <span className="text-slate-400"> · {i.originalName}</span>}</div>
                        <div className="text-xs text-slate-400 truncate">{i.country ?? '—'}{i.elevation != null && ` · ${i.elevation} m`}</div>
                        {i.description && <div className="text-xs text-slate-500 truncate">{i.description}</div>}</div>
                    </button></li>
                  ))}
                </ul>
              )}
              {items.length > 0 && <Btn className="w-full mt-2" onClick={() => load(false)} disabled={busy}>{busy ? <Spinner /> : t('atlas.loadMore')}</Btn>}
            </Glass>
            <Glass className="p-3"><AttributionList ids={['wikidata', 'openfreemap']} /></Glass>
          </>
        )}
      </aside>
      <div className="lg:flex-1 shrink-0 order-1 lg:order-2 h-[50vh] lg:h-auto"><MapView className="h-full" center={[12, 46]} zoom={3.2} pitch={0} mode="flat" onReady={setEngine} /></div>
    </div>
  );
}

/** Wikimedia Commons thumbnail via Special:FilePath width parameter. */
export const thumb = (url: string, w: number) => url.replace('http://', 'https://') + `?width=${w}`;

function DestinationDetail({ item, onBack, onSaved }: { item: AtlasItem; onBack: () => void; onSaved: (s: { id: string; name: string }[]) => void }) {
  const { t } = useI18n();
  const { go, setPlan, setFocus } = useStore();
  const [trails, setTrails] = useState<Trail[] | null>(null);
  const [trailErr, setTrailErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [season, setSeason] = useState<(typeof SEASONS)[number]>(() => { const m = new Date().getMonth(); const north = item.lat >= 0; const s = Math.floor(((m + 1) % 12) / 3); return SEASONS[north ? s : (s + 2) % 4]; });
  const [copied, setCopied] = useState(false);

  const findTrails = async () => {
    setBusy(true); setTrailErr(null);
    try { setTrails((await api<{ trails: Trail[] }>(`/api/trails?lon=${item.lon}&lat=${item.lat}&radiusKm=10`)).trails); }
    catch (e) { setTrailErr(e); } finally { setBusy(false); }
  };

  const save = async () => { await Destinations.put({ id: item.id, name: item.name, lon: item.lon, lat: item.lat, category: item.category, source: item.source, savedAt: new Date().toISOString() }); onSaved((await Destinations.list()).map((x) => ({ id: x.id, name: x.name }))); };
  const share = async () => {
    const url = `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=13/${item.lat}/${item.lon}`;
    if (navigator.share) { try { await navigator.share({ title: item.name, text: `${item.name} — SAMIR WANDERUNG`, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard?.writeText(`${item.name} ${url}`); setCopied(true);
  };

  return (
    <div className="space-y-3" data-testid="destination-detail">
      <Glass className="overflow-hidden">
        {item.image && <img src={thumb(item.image, 800)} alt={item.name} className="w-full h-48 object-cover bg-ink-700" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <div className="p-4 space-y-2">
          <Btn variant="chip" onClick={onBack}>← {t('atlas.title')}</Btn>
          <h1 className="font-display text-2xl text-white">{item.name}</h1>
          {item.originalName && item.originalName !== item.name && <div className="text-sm text-slate-400">{item.originalName}</div>}
          <div className="text-sm text-slate-300">{item.country ?? '—'} · {t(`atlas.cat.${item.category}` as TKey)} · <span className="font-mono text-xs">{item.lat.toFixed(4)}, {item.lon.toFixed(4)}</span></div>
          {item.elevation != null && <div className="text-sm text-aqua-300">▲ {item.elevation} m <span className="text-slate-500 text-xs">(Wikidata P2044)</span></div>}
          {item.description ? <p className="text-sm text-slate-300">{item.description}</p> : <p className="text-xs text-slate-500">No description available in this language on Wikidata.</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Btn variant="primary" onClick={() => { setFocus({ coord: [item.lon, item.lat], name: item.name }); go('world', `${item.lon},${item.lat},${item.name}`); }}>◍ {t('atlas.explore3d')}</Btn>
            <Btn onClick={() => { setPlan((c) => { const pts = [...c.points]; pts[pts.length - 1] = { name: item.name, coord: [item.lon, item.lat], origin: 'atlas' }; return { ...c, points: pts }; }); setFocus({ coord: [item.lon, item.lat], name: item.name }); go('planner'); }}>⇢ {t('atlas.planHike')}</Btn>
            <Btn onClick={save}>☆ {t('atlas.saveDest')}</Btn>
            <Btn onClick={share}>{copied ? '✓' : '↗'} {t('atlas.share')}</Btn>
          </div>
          <ul className="text-xs text-slate-400 space-y-0.5 pt-2">
            <li>{t('common.source')}: <a className="text-aqua-300 hover:underline" href={item.source} target="_blank" rel="noreferrer">Wikidata {item.id}</a> (CC0)</li>
            {item.article && <li><a className="hover:text-aqua-300" href={item.article} target="_blank" rel="noreferrer">Wikipedia</a></li>}
            {item.website && <li>{t('atlas.official')}: <a className="hover:text-aqua-300" href={item.website} target="_blank" rel="noreferrer">{new URL(item.website).hostname}</a> <span className="text-slate-500">(Wikidata P856)</span></li>}
            {item.image && <li>Photo: <a className="hover:text-aqua-300" href={item.image.replace('Special:FilePath/', 'File:')} target="_blank" rel="noreferrer">Wikimedia Commons</a> — see file page for author & licence</li>}
          </ul>
        </div>
      </Glass>

      <Glass className="p-4 space-y-2">
        <h2 className="font-display text-white">{t('atlas.trails')}</h2>
        {!trails && <Btn onClick={findTrails} disabled={busy}>{busy ? <Spinner /> : t('atlas.findTrails')}</Btn>}
        {trailErr != null && <ErrorBox error={trailErr} onRetry={findTrails} />}
        {trails && (trails.length === 0 ? <p className="text-xs text-slate-400">{t('atlas.noTrails')}</p> : (
          <ul className="divide-y divide-white/5 max-h-72 overflow-auto scrollbar-thin">{trails.map((tr) => (
            <li key={tr.id} className="py-2 text-sm flex justify-between gap-2">
              <div className="min-w-0"><div className="text-white truncate">{tr.name ?? tr.ref ?? tr.id}</div>
                <div className="text-xs text-slate-400">{[tr.network, tr.distance && `${tr.distance} km (OSM tag)`, tr.operator, tr.from && tr.to && `${tr.from} → ${tr.to}`].filter(Boolean).join(' · ')}</div></div>
              <a className="btn btn-chip text-xs shrink-0" href={`https://www.openstreetmap.org/${tr.id}`} target="_blank" rel="noreferrer">OSM</a>
            </li>))}</ul>
        ))}
        <p className="text-[11px] text-slate-500">Trails listed are OSM route relations; plan a hike to get a route verified by the routing engine. Access, private land and closures are not known unless stated by an official source.</p>
      </Glass>

      <Glass className="p-4 space-y-2">
        <h2 className="font-display text-white">{t('atlas.season')}</h2>
        <div className="flex gap-1">{SEASONS.map((s) => <button key={s} className={`btn btn-chip text-xs ${season === s ? 'is-active' : ''}`} onClick={() => setSeason(s)}>{s}</button>)}</div>
        <p className="text-xs text-slate-300">{seasonNote(season, item)}</p>
        <p className="text-[11px] text-slate-500">General seasonal guidance only — no verified opening dates or access restrictions are connected for this destination. Climate averages are not a forecast.</p>
      </Glass>
      <WeatherPanel coord={[item.lon, item.lat]} hours={6} />
    </div>
  );
}

function seasonNote(s: string, item: AtlasItem): string {
  const high = (item.elevation ?? 0) > 2000 || item.category === 'glacier';
  if (s === 'winter') return high ? 'High alpine terrain: expect snow, avalanche terrain and closed huts/lifts in many regions. Winter hiking here needs specialist equipment and avalanche information from the regional service.' : 'Shorter days; trails may be icy or muddy. Check local conditions.';
  if (s === 'spring') return high ? 'Snow often lingers at altitude into early summer; snowfields can be dangerous. Check regional snow and avalanche bulletins.' : 'Waterfalls usually carry most water during snowmelt; paths may be wet.';
  if (s === 'summer') return high ? 'Main season for high routes in many mountain ranges; afternoon thunderstorms are common in mountains.' : 'Peak season; start early to avoid heat.';
  return 'Stable weather is common in many mountain regions, but days shorten and first snow can arrive early at altitude.';
}
