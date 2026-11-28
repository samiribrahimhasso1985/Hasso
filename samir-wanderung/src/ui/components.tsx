import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useI18n, type TKey } from '../core/i18n';
import { api, ApiError } from '../core/api';
import { parseCoordinates, type LngLat } from '../engines/route/geo';
import type { Place } from '../engines/route/types';
import { GPSEngine } from '../engines/gps/GPSEngine';
import { PROVIDERS } from '../config/providers';

export function Glass({ children, className = '', as: As = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'aside' | 'header'; [k: string]: unknown }) {
  return <As className={`glass ${className}`} {...rest}>{children}</As>;
}

export function Btn({ variant = 'ghost', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'chip' }) {
  return <button {...p} className={`btn btn-${variant} ${className}`} />;
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const code = error instanceof ApiError ? error.code : (error as Error)?.message;
  return (
    <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
      <div className="font-medium">{t('common.error')}</div>
      <div className="opacity-80 font-mono text-xs mt-1">{code}</div>
      {onRetry && <Btn className="mt-2" onClick={onRetry}>{t('common.retry')}</Btn>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-400 py-6 text-center">{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center gap-2 text-sm text-aqua-300" role="status"><span className="spinner" aria-hidden />{label}</div>;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 className="font-display text-2xl md:text-3xl tracking-wide text-white">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </header>
  );
}

export interface GeoResult { name: string; displayName: string; lon: number; lat: number; category: string; type: string; country?: string; countryCode?: string; elevation: number | null; wikidata: string | null; bbox?: number[] }

/**
 * Worldwide place search: Nominatim results, decimal coordinates ("lat, lon"),
 * GPS (with permission) and pick-on-map.
 */
export function PlaceSearch({ label, value, onChange, onPickOnMap, allowGps = true, id }: {
  label: string; value: Place | null; onChange: (p: Place | null) => void; onPickOnMap?: () => void; allowGps?: boolean; id: string;
}) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState(value?.name ?? '');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setQ(value?.name ?? ''); }, [value]);

  useEffect(() => {
    const text = q.trim();
    if (!open || text.length < 3 || text === value?.name) { setResults([]); return; }
    if (parseCoordinates(text)) { setResults([]); return; }
    const h = setTimeout(async () => {
      abort.current?.abort(); abort.current = new AbortController();
      setBusy(true); setErr(null);
      try {
        const r = await api<{ results: GeoResult[] }>(`/api/geocode?q=${encodeURIComponent(text)}&lang=${lang}`, { signal: abort.current.signal });
        setResults(r.results);
      } catch (e) { if ((e as Error).name !== 'AbortError') setErr(e instanceof ApiError ? e.code : 'error'); }
      finally { setBusy(false); }
    }, 450); // debounce (Nominatim policy: no per-keystroke autocomplete bursts)
    return () => clearTimeout(h);
  }, [q, open, lang, value?.name]);

  const submitCoords = () => {
    const c = parseCoordinates(q);
    if (c) { onChange({ name: `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`, coord: c, origin: 'coordinates' }); setOpen(false); }
  };

  const useGps = async () => {
    setBusy(true); setErr(null);
    try {
      const c = await GPSEngine.currentPosition();
      onChange({ name: `GPS ${c[1].toFixed(5)}, ${c[0].toFixed(5)}`, coord: c, origin: 'gps' });
    } catch (e) { setErr((e as Error).message === 'denied' ? t('live.denied') : t('live.unavailable')); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex gap-1.5">
        <input id={id} className="field flex-1 min-w-0" value={q} placeholder={t('common.searchPlaceholder')} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submitCoords(); if (e.key === 'Escape') setOpen(false); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          aria-autocomplete="list" aria-controls={`${id}-list`} aria-expanded={open && results.length > 0} role="combobox" />
        {allowGps && <Btn type="button" variant="chip" onClick={useGps} title={t('home.useGps')} aria-label={t('home.useGps')}>◎</Btn>}
        {onPickOnMap && <Btn type="button" variant="chip" onClick={onPickOnMap} title={t('planner.pickOnMap')} aria-label={t('planner.pickOnMap')}>⌖</Btn>}
      </div>
      {busy && <div className="absolute end-24 top-9"><span className="spinner" aria-hidden /></div>}
      {err && <div className="text-xs text-red-300 mt-1">{err}</div>}
      {parseCoordinates(q) && q !== value?.name && <button type="button" className="text-xs text-aqua-300 mt-1 underline" onClick={submitCoords}>↵ {q}</button>}
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 w-full max-h-72 overflow-auto glass p-1">
          {results.map((r, i) => (
            <li key={i} role="option" aria-selected={false}>
              <button type="button" className="w-full text-start px-3 py-2 rounded-lg hover:bg-white/10 focus:bg-white/10"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange({ name: r.name, coord: [r.lon, r.lat], origin: 'geocoder', detail: r.displayName, category: `${r.category}/${r.type}` }); setOpen(false); }}>
                <div className="text-sm text-white">{r.name} {r.elevation != null && <span className="text-aqua-300 text-xs">▲ {r.elevation} m</span>}</div>
                <div className="text-xs text-slate-400 truncate">{r.displayName}</div>
              </button>
            </li>
          ))}
          <li className="px-3 py-1 text-[10px] text-slate-500">{PROVIDERS.nominatim.attribution}</li>
        </ul>
      )}
    </div>
  );
}

/** Elevation profile (SVG). Hover/scrub reports the distance so the map can show the point. */
export function ElevationProfile({ samples, height = 120, onHover, marker }: {
  samples: { d: number; h: number | null }[]; height?: number; onHover?: (d: number | null) => void; marker?: number | null;
}) {
  const { t, fmt } = useI18n();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const known = samples.filter((s) => s.h != null) as { d: number; h: number }[];
  if (known.length < 2) return <div className="text-xs text-slate-400">{t('planner.profile')}: {t('common.unknown')}</div>;
  const W = 600, H = height, pad = 24;
  const maxD = samples.at(-1)!.d;
  const minH = Math.min(...known.map((s) => s.h)), maxH = Math.max(...known.map((s) => s.h));
  const span = Math.max(20, maxH - minH);
  const x = (d: number) => pad + (d / maxD) * (W - pad * 2);
  const y = (h: number) => H - 18 - ((h - minH) / span) * (H - 34);
  const path = known.map((s, i) => `${i ? 'L' : 'M'}${x(s.d).toFixed(1)},${y(s.h).toFixed(1)}`).join('');
  const area = `${path}L${x(known.at(-1)!.d)},${H - 18}L${x(known[0].d)},${H - 18}Z`;
  const pos = hover ?? marker ?? null;
  const at = pos != null ? known.reduce((a, b) => (Math.abs(b.d - pos) < Math.abs(a.d - pos) ? b : a)) : null;
  const move = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const fx = (clientX - r.left) / r.width; // SVG is always LTR so distance increases left→right
    const d = Math.max(0, Math.min(maxD, ((fx * W - pad) / (W - pad * 2)) * maxD));
    setHover(d); onHover?.(d);
  };
  return (
    <figure dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="img" aria-label={t('planner.profile')}
        onPointerMove={(e) => move(e.clientX)} onPointerDown={(e) => move(e.clientX)} onPointerLeave={() => { setHover(null); onHover?.(null); }}>
        <defs><linearGradient id="elev" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#14d3c8" stopOpacity=".55" /><stop offset="1" stopColor="#14d3c8" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#elev)" />
        <path d={path} fill="none" stroke="#7ff3ea" strokeWidth="2" />
        <text x={pad} y={12} fill="#94a3b8" fontSize="10">{fmt(maxH, 0)} m</text>
        <text x={pad} y={H - 4} fill="#94a3b8" fontSize="10">{fmt(minH, 0)} m · 0 km</text>
        <text x={W - pad} y={H - 4} fill="#94a3b8" fontSize="10" textAnchor="end">{fmt(maxD / 1000, 1)} km</text>
        {at && <><line x1={x(at.d)} x2={x(at.d)} y1={8} y2={H - 18} stroke="#38d9ff" strokeDasharray="3 3" />
          <circle cx={x(at.d)} cy={y(at.h)} r={4} fill="#38d9ff" />
          <text x={Math.min(W - 80, x(at.d) + 6)} y={y(at.h) - 8} fill="#e2fffd" fontSize="11">{fmt(at.d / 1000, 2)} km · {fmt(at.h, 0)} m</text></>}
      </svg>
    </figure>
  );
}

export function AttributionList({ ids }: { ids: (keyof typeof PROVIDERS)[] }) {
  return (
    <ul className="text-[11px] leading-relaxed text-slate-400 space-y-0.5">
      {ids.map((id) => <li key={id}><a className="hover:text-aqua-300" href={PROVIDERS[id].licenseUrl} target="_blank" rel="noreferrer">{PROVIDERS[id].attribution}</a></li>)}
    </ul>
  );
}

export function useT() { return useI18n().t as (k: TKey) => string; }

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span className="text-sm text-slate-200">{label}</span>
      <input type="checkbox" className="toggle" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export const fmtKm = (m: number) => (m / 1000).toFixed(m < 10000 ? 2 : 1);
export const lngLatText = (c: LngLat) => `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`;
