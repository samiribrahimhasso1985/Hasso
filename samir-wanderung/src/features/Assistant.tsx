import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { Btn, ElevationProfile, ErrorBox, Glass, Spinner, Stat } from '../ui/components';
import { api, ApiError } from '../core/api';
import { calculateRoutes } from '../engines/route/RouteEngine';
import { formatDuration } from '../engines/route/stats';
import { GPSEngine } from '../engines/gps/GPSEngine';
import { getWeather, forecastWindow } from '../engines/weather/WeatherEngine';
import { packingList } from '../engines/ai/packing';
import type { Place, Route, RouteType } from '../engines/route/types';
import type { GeoResult } from '../ui/components';

interface AiPlan { startQuery: string | null; destinationQuery: string; stopQueries: string[]; routeType: RouteType; roundTrip: boolean; targetHours: number | null; suggestedStops: string[] }
interface AiReply { reply: string; intent: string; plan: AiPlan | null; packing: string[]; model?: string }
interface Msg { role: 'user' | 'assistant'; content: string; plan?: AiPlan | null; packing?: string[] }
interface Verified { points: Place[]; route: Route | null; error?: unknown; plan: AiPlan; weatherNote?: string; packing: { item: string; why: string }[] }

/**
 * Conversational hiking assistant. The model (server-side, key never in the browser) proposes a
 * plan using real place names; this page geocodes them and verifies the route with Valhalla.
 * Nothing is saved or started without the user's explicit confirmation.
 */
export default function Assistant() {
  const { t, lang } = useI18n();
  const { setPlan, setRoutes, selectRoute, go, focus } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [verified, setVerified] = useState<Verified | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [needs, setNeeds] = useState({ kids: false, dog: false, photography: false, overnight: false });
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { api<{ ai: { configured: boolean } }>('/api/status').then((s) => setAiOk(s.ai.configured)).catch(() => setAiOk(false)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, verified]);

  const send = async () => {
    const text = input.trim(); if (!text) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setInput(''); setBusy(true); setErr(null);
    try {
      const r = await api<AiReply>('/api/ai/chat', { method: 'POST', body: { messages: next.map((m) => ({ role: m.role, content: m.content })), context: { lang, near: focus?.name } } });
      setMsgs([...next, { role: 'assistant', content: r.reply, plan: r.plan, packing: r.packing }]);
      if (r.plan) verify(r.plan);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const geocode = async (q: string): Promise<Place | null> => {
    const r = await api<{ results: GeoResult[] }>(`/api/geocode?q=${encodeURIComponent(q)}&limit=1&lang=${lang}`);
    const x = r.results[0]; return x ? { name: x.name, coord: [x.lon, x.lat], origin: 'geocoder', detail: x.displayName } : null;
  };

  const verify = async (plan: AiPlan) => {
    setVerifying(true); setVerified(null);
    const v: Verified = { points: [], route: null, plan, packing: [] };
    try {
      let start: Place | null = null;
      if (plan.startQuery) start = await geocode(plan.startQuery);
      else { try { const c = await GPSEngine.currentPosition(); start = { name: 'GPS', coord: c, origin: 'gps' }; } catch { throw new ApiError(400, 'start_unknown_enable_gps_or_name_a_start'); } }
      const dest = await geocode(plan.destinationQuery);
      if (!start) throw new ApiError(404, `start_not_found: ${plan.startQuery}`);
      if (!dest) throw new ApiError(404, `destination_not_found: ${plan.destinationQuery}`);
      const stops: Place[] = [];
      for (const s of plan.stopQueries.slice(0, 5)) { const p = await geocode(s); if (p) stops.push(p); }
      v.points = [start, ...stops, dest];
      const routes = await calculateRoutes({ points: v.points, type: plan.routeType, roundTrip: plan.roundTrip });
      v.route = routes[0];
      // Weather-aware packing list.
      let w = null; try { w = await getWeather(start.coord); } catch { v.weatherNote = t('weather.unavailable'); }
      const rows = w ? forecastWindow(w, new Date(), Math.ceil(v.route.hikingHours)) : [];
      v.packing = packingList({
        hours: v.route.hikingHours, maxEle: v.route.maxEle, minTemp: rows.length ? Math.min(...rows.map((r) => r.temp)) : null,
        maxPrecipProb: rows.length ? Math.max(...rows.map((r) => r.pop ?? 0)) : null, maxGust: rows.length ? Math.max(...rows.map((r) => r.gusts)) : null,
        snow: rows.some((r) => r.snow > 0), month: new Date().getMonth(), northern: start.coord[1] >= 0, needs,
      });
    } catch (e) { v.error = e; }
    setVerified(v); setVerifying(false);
  };

  const confirmToPlanner = () => {
    if (!verified?.route) return;
    setPlan({ points: verified.points, type: verified.plan.routeType, roundTrip: verified.plan.roundTrip });
    setRoutes([verified.route]); selectRoute(verified.route.id); go('planner');
  };

  const examples = ['Find family-friendly hiking routes near Garmisch-Partenkirchen', 'Plan a two-hour mountain hike from Eibsee', 'Plane eine Tageswanderung zum Königssee', 'خطط لرحلة مشي جبلية لمدة ساعتين قرب زيورخ'];

  return (
    <div className="page max-w-4xl">
      <h1 className="font-display text-2xl text-white mb-1">{t('ai.title')}</h1>
      <p className="text-xs text-slate-400 mb-3">{t('ai.disclaimer')}</p>
      {aiOk === false && <Glass className="p-3 mb-3 text-sm text-amber-200" role="status">{t('ai.notConfigured')}</Glass>}
      <Glass className="p-3 space-y-3 min-h-[40vh]">
        {msgs.length === 0 && <div className="flex flex-wrap gap-2">{examples.map((e) => <Btn key={e} variant="chip" className="text-xs" onClick={() => setInput(e)}>{e}</Btn>)}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-aqua-500/15 border border-aqua-500/30' : 'bg-white/5 border border-white/10'}`} dir="auto">
              {m.content}
              {m.packing && m.packing.length > 0 && <div className="mt-2 text-xs text-slate-300"><b>{t('ai.packing')}:</b> {m.packing.join(' · ')}</div>}
            </div>
          </div>
        ))}
        {busy && <Spinner label="…" />}
        {err != null && (err instanceof ApiError && err.code === 'ai_not_configured' ? <p className="text-sm text-amber-200">{t('ai.notConfigured')}</p> : <ErrorBox error={err} />)}
        {verifying && <Spinner label={t('planner.calculating')} />}
        {verified && (
          <div className="rounded-xl border border-white/10 p-3 space-y-2" data-testid="ai-verified">
            {verified.error ? <><p className="text-sm text-amber-200">The suggestion could not be verified, so it is not shown as a route.</p><ErrorBox error={verified.error} /></> : verified.route && (
              <>
                <div className="flex items-center gap-2"><span className="badge badge-sim">✓ {t('ai.verified')}</span><span className="text-sm text-white">{verified.points.map((p) => p.name).join(' → ')}</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label={t('planner.distance')} value={`${verified.route.distanceKm.toFixed(2)} km`} />
                  <Stat label={t('planner.duration')} value={formatDuration(verified.route.hikingHours)} note={t('common.estimate')} />
                  <Stat label={t('planner.ascent')} value={`${verified.route.ascent} m`} />
                  <Stat label={t('planner.difficulty')} value={t(`planner.diff.${verified.route.difficulty}` as const)} note="estimate, not official" />
                </div>
                {verified.plan.targetHours != null && Math.abs(verified.route.hikingHours - verified.plan.targetHours) > 0.75 && (
                  <p className="text-xs text-amber-200">Requested ≈{verified.plan.targetHours} h; the verified route is estimated at {formatDuration(verified.route.hikingHours)}.</p>
                )}
                <ElevationProfile samples={verified.route.elevation} height={90} />
                {verified.plan.suggestedStops.length > 0 && <p className="text-xs text-slate-300">Suggested stops (unverified names): {verified.plan.suggestedStops.join(', ')}</p>}
                <div>
                  <div className="field-label">{t('ai.packing')}</div>
                  <div className="flex flex-wrap gap-3 text-xs mb-1">{(['kids', 'dog', 'photography', 'overnight'] as const).map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={needs[k]} onChange={(e) => setNeeds({ ...needs, [k]: e.target.checked })} />{k}</label>)}</div>
                  <ul className="text-xs text-slate-300 list-disc ps-5">{verified.packing.map((p) => <li key={p.item}>{p.item} <span className="text-slate-500">— {p.why}</span></li>)}</ul>
                  <p className="text-[11px] text-slate-500 mt-1">General preparation advice. {verified.weatherNote}</p>
                </div>
                <p className="text-xs text-amber-200/90">{t('planner.safety')}</p>
                <Btn variant="primary" onClick={confirmToPlanner}>{t('ai.confirm')}</Btn>
              </>
            )}
          </div>
        )}
        <div ref={end} />
      </Glass>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="field flex-1" dir="auto" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('ai.placeholder')} aria-label={t('ai.placeholder')} maxLength={2000} />
        <Btn variant="primary" type="submit" disabled={busy || !input.trim()}>{t('ai.send')}</Btn>
      </form>
    </div>
  );
}
