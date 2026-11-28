import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { api, apiUrl, ApiError, isStandalone } from '../core/api';
import { Btn, Empty, ErrorBox, Glass, PlaceSearch, Spinner, Toggle } from '../ui/components';
import { MapView } from '../ui/MapView';
import { Journeys } from '../engines/storage/db';
import type { Journey, Place } from '../engines/route/types';
import type { MapEngine } from '../engines/map/MapEngine';
import type { GeoJSONSource } from 'maplibre-gl';

interface User { id: number; displayName: string; avatar: string | null; private?: boolean; bio?: string; country?: string; region?: string; interests?: string[]; level?: string; followers?: number; following?: number; completedJourneys?: number; isFollowing?: boolean; email?: string; profilePublic?: boolean; minor?: boolean }
interface Post { id: number; kind: string; text: string; visibility: string; createdAt: string; author: User; media: string[]; route: [number, number][] | null; stats: Record<string, number | string> | null; reactions: number; comments: number; myReaction: string | null; bookmarked: boolean }
interface Ev { id: number; title: string; description: string; organizer: User; start: { name: string; lon: number; lat: number }; destination: { name: string; lon: number; lat: number } | null; startsAt: string; durationH: number | null; difficulty: string | null; maxParticipants: number; accepted: number; equipment: string; visibility: string; adultsOnly: boolean; status: string; myStatus: string | null; distanceKm: number | null; updates: { text: string; createdAt: string }[] }
interface Group { id: number; name: string; description: string; visibility: string; members: number; myRole: string | null; owner: { id: number; displayName: string } }

type Tab = 'feed' | 'events' | 'groups' | 'map' | 'profile' | 'notifications' | 'guidelines';

export default function Community() {
  const { t } = useI18n();
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('feed');
  const refreshMe = useCallback(() => api<{ user: User | null }>('/api/me').then((r) => setMe(r.user)).catch(() => setMe(null)), []);
  useEffect(() => { refreshMe(); }, [refreshMe]);

  return (
    <div className="page">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h1 className="font-display text-2xl text-white">{t('community.title')}</h1>
        {me && <div className="text-sm text-slate-300">{me.displayName} <Btn variant="chip" onClick={() => api('/api/auth/logout', { method: 'POST' }).then(refreshMe)}>{t('community.logout')}</Btn></div>}
      </header>
      <p className="text-xs text-slate-400 mb-3">{t('community.noSafety')}</p>
      {isStandalone() && <p className="text-sm text-amber-200 glass p-3 mb-3" role="status">The community needs a SSBN server. Set its address in Settings → Server.</p>}
      <nav className="flex flex-wrap gap-1 mb-4" role="tablist">
        {(['feed', 'events', 'groups', 'map', 'profile', 'notifications', 'guidelines'] as Tab[]).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={`btn btn-chip text-xs ${tab === x ? 'is-active' : ''}`} onClick={() => setTab(x)}>
            {x === 'feed' ? t('community.feed') : x === 'events' ? t('community.events') : x === 'groups' ? t('community.groups') : x === 'profile' ? t('community.profile') : x === 'guidelines' ? t('community.guidelines') : x}
          </button>
        ))}
      </nav>
      {me === undefined ? <Spinner /> : !me && ['profile', 'notifications'].includes(tab) ? <Auth onDone={refreshMe} /> : (
        <>
          {!me && tab !== 'guidelines' && <div className="mb-4"><Auth onDone={refreshMe} compact /></div>}
          {tab === 'feed' && <Feed me={me ?? null} />}
          {tab === 'events' && <Events me={me ?? null} />}
          {tab === 'groups' && <Groups me={me ?? null} />}
          {tab === 'map' && <CommunityMap />}
          {tab === 'profile' && me && <Profile me={me} onChange={refreshMe} />}
          {tab === 'notifications' && me && <Notifications />}
          {tab === 'guidelines' && <Guidelines />}
        </>
      )}
    </div>
  );
}

function Auth({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ email: '', password: '', displayName: '', birthYear: '' });
  const [err, setErr] = useState<unknown>(null);
  const [open, setOpen] = useState(!compact);
  const submit = async () => {
    setErr(null);
    try {
      if (mode === 'register') await api('/api/auth/register', { method: 'POST', body: { ...f, birthYear: +f.birthYear } });
      await api('/api/auth/login', { method: 'POST', body: { email: f.email, password: f.password } });
      onDone();
    } catch (e) { setErr(e); }
  };
  if (!open) return <Glass className="p-3 flex items-center justify-between text-sm"><span>{t('community.login')} / {t('community.register')}</span><Btn variant="primary" onClick={() => setOpen(true)}>{t('community.login')}</Btn></Glass>;
  return (
    <Glass className="p-4 max-w-md space-y-2" as="section">
      <div className="flex gap-1">{(['login', 'register'] as const).map((m) => <button key={m} className={`btn btn-chip text-xs ${mode === m ? 'is-active' : ''}`} onClick={() => setMode(m)}>{t(m === 'login' ? 'community.login' : 'community.register')}</button>)}</div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="field" type="email" autoComplete="email" placeholder={t('community.email')} aria-label={t('community.email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className="field" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={`${t('community.password')}${mode === 'register' ? ' (min. 10)' : ''}`} aria-label={t('community.password')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={mode === 'register' ? 10 : 1} />
        {mode === 'register' && <>
          <input className="field" placeholder={t('community.displayName')} aria-label={t('community.displayName')} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required />
          <input className="field" type="number" placeholder="Birth year (13+)" aria-label="Birth year" value={f.birthYear} onChange={(e) => setF({ ...f, birthYear: e.target.value })} required />
          <p className="text-[11px] text-slate-500">Accounts of users under 18 are private by default and cannot join adults-only events or organise events. Age is self-declared and not verified.</p>
        </>}
        <Btn variant="primary" type="submit">{t(mode === 'login' ? 'community.login' : 'community.register')}</Btn>
      </form>
      {err != null && <ErrorBox error={err} />}
    </Glass>
  );
}

function Feed({ me }: { me: User | null }) {
  const { t } = useI18n();
  const [scope, setScope] = useState<'all' | 'following' | 'bookmarks' | 'mine'>('all');
  const [items, setItems] = useState<Post[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const load = useCallback(async (before?: number) => {
    try {
      const r = await api<{ items: Post[]; nextBefore: number | null }>(`/api/feed?scope=${scope}&limit=10${before ? `&before=${before}` : ''}`);
      setItems((c) => (before ? [...c, ...r.items] : r.items)); setNext(r.nextBefore);
    } catch (e) { setErr(e); }
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {me && <Composer onPosted={() => load()} />}
        <div className="flex gap-1">{(['all', 'following', 'bookmarks', 'mine'] as const).map((s) => <button key={s} disabled={!me && s !== 'all'} className={`btn btn-chip text-xs ${scope === s ? 'is-active' : ''}`} onClick={() => setScope(s)}>{s}</button>)}</div>
        {err != null && <ErrorBox error={err} />}
        {items.length === 0 ? <Empty>{t('common.empty')}</Empty> : items.map((p) => <PostCard key={p.id} post={p} me={me} onChange={() => load()} />)}
        {next && <Btn onClick={() => load(next)}>{t('atlas.loadMore')}</Btn>}
      </div>
    </div>
  );
}

const toDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

function Composer({ onPosted }: { onPosted: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [vis, setVis] = useState('public');
  const [files, setFiles] = useState<File[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [jid, setJid] = useState('');
  const [routeConsent, setRouteConsent] = useState(false);
  const [hideEnds, setHideEnds] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { Journeys.list().then(setJourneys); }, []);
  const j = journeys.find((x) => x.id === jid);
  const post = async () => {
    setBusy(true); setErr(null);
    try {
      const coords = j?.route?.coords ?? j?.track?.map((p) => [p.lon, p.lat]);
      await api('/api/posts', { method: 'POST', body: {
        text, visibility: vis, kind: j ? 'journey' : files.length ? 'photo' : 'story', media: await Promise.all(files.map(toDataUrl)),
        ...(j && routeConsent && coords ? { route: coords, routeConsent: true, hideEndpoints: hideEnds } : {}),
        ...(j?.route ? { stats: { distanceKm: +j.route.distanceKm.toFixed(2), ascent: j.route.ascent, descent: j.route.descent, durationH: +j.route.hikingHours.toFixed(2), maxEle: j.route.maxEle ?? undefined } } : {}),
      } });
      setText(''); setFiles([]); setJid(''); setRouteConsent(false); onPosted();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <Glass className="p-3 space-y-2">
      <textarea className="field min-h-20" dir="auto" placeholder={t('community.whatsNew')} value={text} onChange={(e) => setText(e.target.value)} aria-label={t('community.whatsNew')} maxLength={5000} />
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <label className="btn btn-chip cursor-pointer">📷 {files.length || ''}<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 6))} /></label>
        <select className="field w-auto" value={vis} onChange={(e) => setVis(e.target.value)} aria-label={t('community.visibility')}>
          <option value="public">{t('community.vis.public')}</option><option value="followers">{t('community.vis.followers')}</option><option value="private">{t('community.vis.private')}</option>
        </select>
        <select className="field w-auto max-w-[220px]" value={jid} onChange={(e) => setJid(e.target.value)} aria-label="Journey"><option value="">— journey story —</option>{journeys.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <Btn variant="primary" onClick={post} disabled={busy || (!text && !files.length && !jid)}>{t('community.post')}</Btn>
      </div>
      {j && <div className="text-xs space-y-1 border-t border-white/10 pt-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={routeConsent} onChange={(e) => setRouteConsent(e.target.checked)} /> I consent to publishing this GPS route</label>
        {routeConsent && <label className="flex items-center gap-2"><input type="checkbox" checked={hideEnds} onChange={(e) => setHideEnds(e.target.checked)} /> Hide exact start and end (~300 m trimmed on the server)</label>}
      </div>}
      {err != null && <ErrorBox error={err} />}
    </Glass>
  );
}

function PostCard({ post, me, onChange }: { post: Post; me: User | null; onChange: () => void }) {
  const { t } = useI18n();
  const [comments, setComments] = useState<{ id: number; text: string; author: { id: number; displayName: string } }[] | null>(null);
  const [c, setC] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); onChange(); } catch (e) { setErr(e); } };
  const loadComments = async () => setComments((await api<{ items: typeof comments }>(`/api/posts/${post.id}/comments`)).items);
  return (
    <Glass className="p-3 space-y-2" as="section" data-testid="post">
      <div className="flex justify-between text-sm"><span className="text-white">{post.author.displayName}</span><span className="text-xs text-slate-400">{post.visibility} · {new Date(post.createdAt).toLocaleString()}</span></div>
      {post.text && <p className="text-sm whitespace-pre-wrap" dir="auto">{post.text}</p>}
      {post.media.length > 0 && <div className="grid grid-cols-3 gap-1">{post.media.map((m) => m.match(/\.(mp4|webm)$/) ? <video key={m} src={apiUrl(m)} controls className="rounded-lg w-full" /> : <img key={m} src={apiUrl(m)} alt="" className="rounded-lg aspect-square object-cover" loading="lazy" />)}</div>}
      {post.stats && <div className="text-xs text-aqua-300">{post.stats.distanceKm} km · ↑{post.stats.ascent} m{post.route ? ` · GPS route (${post.route.length} pts)` : ''}</div>}
      <div className="flex flex-wrap gap-1 text-xs">
        <Btn variant="chip" disabled={!me} aria-pressed={!!post.myReaction} onClick={() => act(() => api(`/api/posts/${post.id}/reactions`, { method: post.myReaction ? 'DELETE' : 'POST', body: { kind: 'like' } }))}>♥ {post.reactions}</Btn>
        <Btn variant="chip" onClick={() => (comments ? setComments(null) : loadComments())}>💬 {post.comments}</Btn>
        <Btn variant="chip" disabled={!me} onClick={() => act(() => api(`/api/posts/${post.id}/bookmark`, { method: post.bookmarked ? 'DELETE' : 'POST' }))}>{post.bookmarked ? '★' : '☆'}</Btn>
        <Btn variant="chip" onClick={() => navigator.clipboard?.writeText(`${location.origin}/#/community`)}>↗</Btn>
        {me && me.id !== post.author.id && <>
          <Btn variant="chip" onClick={() => { const reason = prompt(t('community.report')); if (reason) act(() => api('/api/reports', { method: 'POST', body: { targetType: 'post', targetId: post.id, reason } })); }}>⚑ {t('community.report')}</Btn>
          <Btn variant="chip" onClick={() => act(() => api(`/api/users/${post.author.id}/${post.author.isFollowing ? 'follow' : 'follow'}`, { method: post.author.isFollowing ? 'DELETE' : 'POST' }))}>{post.author.isFollowing ? t('community.unfollow') : t('community.follow')}</Btn>
          <Btn variant="chip" onClick={() => act(() => api(`/api/users/${post.author.id}/mute`, { method: 'POST' }))}>mute</Btn>
          <Btn variant="chip" onClick={() => confirm(`${t('community.block')} ${post.author.displayName}?`) && act(() => api(`/api/users/${post.author.id}/block`, { method: 'POST' }))}>⦸ {t('community.block')}</Btn>
        </>}
        {me && me.id === post.author.id && <Btn variant="danger" className="!py-1" onClick={() => confirm(t('common.delete') + '?') && act(() => api(`/api/posts/${post.id}`, { method: 'DELETE' }))}>{t('common.delete')}</Btn>}
      </div>
      {comments && <div className="space-y-1 border-t border-white/10 pt-2">
        {comments.map((x) => <div key={x.id} className="text-xs flex justify-between gap-2"><span dir="auto"><b>{x.author.displayName}</b> {x.text}</span>
          {me && (me.id === x.author.id || me.id === post.author.id) && <button className="text-slate-500 hover:text-red-300" aria-label={t('common.delete')} onClick={async () => { await api(`/api/comments/${x.id}`, { method: 'DELETE' }); loadComments(); onChange(); }}>✕</button>}</div>)}
        {me && <form className="flex gap-1" onSubmit={async (e) => { e.preventDefault(); if (!c.trim()) return; await act(() => api(`/api/posts/${post.id}/comments`, { method: 'POST', body: { text: c } })); setC(''); loadComments(); }}>
          <input className="field text-xs" dir="auto" value={c} onChange={(e) => setC(e.target.value)} placeholder={t('community.comment')} aria-label={t('community.comment')} /><Btn variant="chip" type="submit">↵</Btn></form>}
      </div>}
      {err != null && <ErrorBox error={err} />}
    </Glass>
  );
}

function Events({ me }: { me: User | null }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Ev[]>([]);
  const [filters, setFilters] = useState({ country: '', difficulty: '', from: '', to: '', maxKm: '' });
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const load = useCallback(async () => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
    try { setItems((await api<{ items: Ev[] }>(`/api/events?${q}`)).items); } catch (e) { setErr(e); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <Glass className="p-3 flex flex-wrap gap-2 items-end text-xs">
        <input className="field w-28" placeholder="Country" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} aria-label="Country" />
        <select className="field w-32" value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} aria-label={t('planner.difficulty')}><option value="">difficulty</option>{['easy', 'moderate', 'hard', 'alpine'].map((d) => <option key={d}>{d}</option>)}</select>
        <input className="field w-36" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="From" />
        <input className="field w-36" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="To" />
        <input className="field w-24" type="number" placeholder="≤ km" value={filters.maxKm} onChange={(e) => setFilters({ ...filters, maxKm: e.target.value })} aria-label="Max km" />
        {me && !me.minor && <Btn variant="primary" onClick={() => setCreating(!creating)}>＋ {t('community.createEvent')}</Btn>}
      </Glass>
      {creating && <EventForm onCreated={() => { setCreating(false); load(); }} />}
      {err != null && <ErrorBox error={err} />}
      {items.length === 0 ? <Empty>No upcoming public events. Events appear here only when real users create them.</Empty> : items.map((ev) => (
        <Glass key={ev.id} className="p-3 space-y-2" as="section">
          <div className="flex justify-between gap-2"><div><div className="text-white">{ev.title} {ev.status !== 'active' && <span className="badge border-red-400 text-red-300">{ev.status}</span>}</div>
            <div className="text-xs text-slate-400">{new Date(ev.startsAt).toLocaleString()} · {ev.start.name} {ev.destination && `→ ${ev.destination.name}`} · {ev.accepted}/{ev.maxParticipants} · {ev.difficulty ?? '—'} {ev.adultsOnly && '· 18+'}</div></div>
            <Btn variant="chip" onClick={() => setOpen(open === ev.id ? null : ev.id)}>{open === ev.id ? '−' : '+'}</Btn></div>
          {open === ev.id && <EventDetail ev={ev} me={me} onChange={load} />}
        </Glass>
      ))}
    </div>
  );
}

function EventForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ title: '', description: '', startsAt: '', durationH: '4', difficulty: 'moderate', maxParticipants: '10', equipment: '', visibility: 'public', adultsOnly: true, country: '' });
  const [start, setStart] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [jid, setJid] = useState('');
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { Journeys.list().then((j) => setJourneys(j.filter((x) => x.route))); }, []);
  const submit = async () => {
    setErr(null);
    const j = journeys.find((x) => x.id === jid);
    try {
      await api('/api/events', { method: 'POST', body: { ...f, durationH: +f.durationH, maxParticipants: +f.maxParticipants, startsAt: new Date(f.startsAt).toISOString(),
        start: start && { name: start.name, lon: start.coord[0], lat: start.coord[1] }, destination: dest && { name: dest.name, lon: dest.coord[0], lat: dest.coord[1] },
        route: j?.route?.coords, distanceKm: j?.route ? +j.route.distanceKm.toFixed(2) : undefined } });
      onCreated();
    } catch (e) { setErr(e); }
  };
  return (
    <Glass className="p-4 grid gap-2 md:grid-cols-2">
      <input className="field" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
      <input className="field" type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} aria-label="Start time" />
      <PlaceSearch id="ev-start" label={`${t('home.start')} (meeting point)`} value={start} onChange={setStart} />
      <PlaceSearch id="ev-dest" label={t('home.destination')} value={dest} onChange={setDest} allowGps={false} />
      <select className="field" value={jid} onChange={(e) => setJid(e.target.value)} aria-label="Verified route"><option value="">— verified route from my journeys (optional) —</option>{journeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select>
      <input className="field" placeholder="Country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} aria-label="Country" />
      <input className="field" type="number" min={1} value={f.durationH} onChange={(e) => setF({ ...f, durationH: e.target.value })} aria-label="Duration h" />
      <select className="field" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} aria-label={t('planner.difficulty')}>{['easy', 'moderate', 'hard', 'alpine'].map((d) => <option key={d}>{d}</option>)}</select>
      <input className="field" type="number" min={2} max={200} value={f.maxParticipants} onChange={(e) => setF({ ...f, maxParticipants: e.target.value })} aria-label="Max participants" />
      <select className="field" value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })} aria-label={t('community.visibility')}><option value="public">{t('community.vis.public')}</option><option value="private">{t('community.vis.private')}</option></select>
      <textarea className="field md:col-span-2" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Description" />
      <textarea className="field md:col-span-2" placeholder="Required equipment" value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} aria-label="Equipment" />
      <Toggle checked={f.adultsOnly} onChange={(v) => setF({ ...f, adultsOnly: v })} label="Adults only (18+)" />
      <div className="md:col-span-2"><Btn variant="primary" onClick={submit} disabled={!f.title || !f.startsAt || !start}>{t('community.createEvent')}</Btn></div>
      {err != null && <div className="md:col-span-2"><ErrorBox error={err} /></div>}
    </Glass>
  );
}

function EventDetail({ ev, me, onChange }: { ev: Ev; me: User | null; onChange: () => void }) {
  const { t } = useI18n();
  const [parts, setParts] = useState<{ id: number; displayName: string; status: string }[] | null>(null);
  const [live, setLive] = useState<{ participants?: { id: number; displayName: string; lon: number; lat: number; acc: number | null; updatedAt: string }[]; mine?: { expiresAt: string } | null } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [update, setUpdate] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const watch = useRef<number | null>(null);
  const isOrg = me?.id === ev.organizer.id;
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); onChange(); } catch (e) { setErr(e); } };
  const loadParts = useCallback(() => api<{ items: typeof parts }>(`/api/events/${ev.id}/participants`).then((r) => setParts(r.items)).catch(() => setParts(null)), [ev.id]);
  const loadLive = useCallback(() => api<typeof live>(`/api/events/${ev.id}/live`).then(setLive).catch(() => {}), [ev.id]);
  useEffect(() => { if (me && (isOrg || ev.myStatus === 'accepted')) { loadParts(); loadLive(); } }, [me, isOrg, ev.myStatus, loadParts, loadLive]);
  useEffect(() => () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);

  // Live sharing: explicit opt-in; sends real GPS fixes; stops on toggle-off, unmount or event end (server expiry).
  const toggleShare = async (on: boolean) => {
    if (!on) { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setSharing(false); await api(`/api/events/${ev.id}/live`, { method: 'DELETE' }); loadLive(); return; }
    if (!confirm('Share your live location with the organizer of this event only? You can stop at any time; sharing ends automatically when the event ends.')) return;
    setSharing(true);
    watch.current = navigator.geolocation.watchPosition(async (p) => {
      try { await api(`/api/events/${ev.id}/live`, { method: 'POST', body: { consent: true, lon: p.coords.longitude, lat: p.coords.latitude, acc: p.coords.accuracy } }); }
      catch (e) { setErr(e); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setSharing(false); }
    }, () => { setSharing(false); }, { enableHighAccuracy: true, maximumAge: 15000 });
  };

  return (
    <div className="space-y-2 text-sm border-t border-white/10 pt-2">
      {ev.description && <p className="whitespace-pre-wrap" dir="auto">{ev.description}</p>}
      {ev.equipment && <p className="text-xs text-slate-300">Equipment: {ev.equipment}</p>}
      <p className="text-xs text-slate-400">Organizer: {ev.organizer.displayName} · Meeting point: <a className="text-aqua-300" href={`https://www.openstreetmap.org/?mlat=${ev.start.lat}&mlon=${ev.start.lon}#map=16/${ev.start.lat}/${ev.start.lon}`} target="_blank" rel="noreferrer">{ev.start.lat.toFixed(5)}, {ev.start.lon.toFixed(5)}</a></p>
      {ev.updates.map((u, i) => <p key={i} className="text-xs text-aqua-200">📢 {u.text} <span className="text-slate-500">{new Date(u.createdAt).toLocaleString()}</span></p>)}
      <div className="flex flex-wrap gap-1">
        {me && !isOrg && (!ev.myStatus || ev.myStatus === 'left' || ev.myStatus === 'declined') && ev.status === 'active' && <Btn variant="primary" onClick={() => act(() => api(`/api/events/${ev.id}/join`, { method: 'POST' }))}>{t('community.join')}</Btn>}
        {ev.myStatus === 'requested' && <span className="badge border-white/20">requested</span>}
        {me && !isOrg && (ev.myStatus === 'accepted' || ev.myStatus === 'requested') && <Btn onClick={() => act(() => api(`/api/events/${ev.id}/leave`, { method: 'POST' }))}>{t('community.leave')}</Btn>}
        {isOrg && ev.status === 'active' && <Btn variant="danger" onClick={() => confirm('Cancel event?') && act(() => api(`/api/events/${ev.id}/cancel`, { method: 'POST' }))}>{t('common.cancel')} event</Btn>}
        {me && !isOrg && <Btn variant="chip" onClick={() => { const reason = prompt(t('community.report')); if (reason) act(() => api('/api/reports', { method: 'POST', body: { targetType: 'event', targetId: ev.id, reason } })); }}>⚑</Btn>}
      </div>
      {isOrg && <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (update) act(() => api(`/api/events/${ev.id}`, { method: 'PATCH', body: { update } })).then(() => setUpdate('')); }}><input className="field text-xs" placeholder="Post an event update" value={update} onChange={(e) => setUpdate(e.target.value)} aria-label="Event update" /><Btn variant="chip" type="submit">↵</Btn></form>}
      {parts && <div><div className="field-label">Participants</div><ul className="text-xs space-y-1">{parts.map((p) => <li key={p.id} className="flex items-center gap-2">{p.displayName} <span className="text-slate-500">{p.status}</span>
        {isOrg && p.status === 'requested' && <><Btn variant="chip" onClick={() => act(() => api(`/api/events/${ev.id}/respond`, { method: 'POST', body: { userId: p.id, accept: true } })).then(loadParts)}>✓</Btn><Btn variant="chip" onClick={() => act(() => api(`/api/events/${ev.id}/respond`, { method: 'POST', body: { userId: p.id, accept: false } })).then(loadParts)}>✕</Btn></>}</li>)}</ul></div>}
      {me && ev.myStatus === 'accepted' && !isOrg && ev.status === 'active' && (
        <div className="rounded-lg border border-white/10 p-2"><Toggle checked={sharing} onChange={toggleShare} label={t('community.liveShare')} /><p className="text-[11px] text-slate-500">{t('community.liveShareNote')} Only the organizer sees it. {live?.mine && `Active until ${new Date(live.mine.expiresAt).toLocaleString()}.`}</p></div>
      )}
      {isOrg && live?.participants && <div><div className="field-label">Consenting participants' live positions (organizer only)</div>{live.participants.length === 0 ? <p className="text-xs text-slate-500">Nobody is sharing.</p> : <ul className="text-xs">{live.participants.map((p) => <li key={p.id}>{p.displayName}: {p.lat.toFixed(5)}, {p.lon.toFixed(5)} ±{Math.round(p.acc ?? 0)} m · {new Date(p.updatedAt).toLocaleTimeString()}</li>)}</ul>}<Btn variant="chip" onClick={loadLive}>↻</Btn></div>}
      {err != null && <ErrorBox error={err} />}
    </div>
  );
}

function Groups({ me }: { me: User | null }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Group[]>([]);
  const [f, setF] = useState({ name: '', description: '', visibility: 'public' });
  const [sel, setSel] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const load = useCallback(() => api<{ items: Group[] }>('/api/groups').then((r) => setItems(r.items)).catch(setErr), []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); load(); } catch (e) { setErr(e); } };
  return (
    <div className="space-y-3">
      {me && <Glass className="p-3 flex flex-wrap gap-2">
        <input className="field flex-1 min-w-40" placeholder="Group name (e.g. Alpine Adventures)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Group name" />
        <input className="field flex-1 min-w-40" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Description" />
        <select className="field w-auto" value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })} aria-label={t('community.visibility')}><option value="public">{t('community.vis.public')}</option><option value="private">{t('community.vis.private')}</option></select>
        <Btn variant="primary" disabled={f.name.length < 3} onClick={() => act(() => api('/api/groups', { method: 'POST', body: f })).then(() => setF({ name: '', description: '', visibility: 'public' }))}>{t('community.createGroup')}</Btn>
      </Glass>}
      {err != null && <ErrorBox error={err} />}
      {items.length === 0 ? <Empty>No groups yet.</Empty> : items.map((g) => (
        <Glass key={g.id} className="p-3 space-y-2">
          <div className="flex justify-between items-center gap-2"><div><div className="text-white">{g.name} <span className="text-xs text-slate-400">{g.visibility} · {g.members} members{g.myRole ? ` · ${g.myRole}` : ''}</span></div><div className="text-xs text-slate-400">{g.description}</div></div>
            <div className="flex gap-1">
              {me && !g.myRole && g.visibility === 'public' && <Btn variant="chip" onClick={() => act(() => api(`/api/groups/${g.id}/join`, { method: 'POST' }))}>Join</Btn>}
              {me && g.myRole === 'invited' && <Btn variant="chip" onClick={() => act(() => api(`/api/groups/${g.id}/join`, { method: 'POST' }))}>Accept invite</Btn>}
              {me && g.myRole && g.myRole !== 'owner' && g.myRole !== 'invited' && <Btn variant="chip" onClick={() => act(() => api(`/api/groups/${g.id}/leave`, { method: 'POST' }))}>{t('community.leave')}</Btn>}
              <Btn variant="chip" onClick={() => setSel(sel === g.id ? null : g.id)}>{sel === g.id ? '−' : '+'}</Btn>
            </div></div>
          {sel === g.id && <GroupDetail id={g.id} me={me} />}
        </Glass>
      ))}
    </div>
  );
}

function GroupDetail({ id, me }: { id: number; me: User | null }) {
  const [g, setG] = useState<(Group & { memberList?: { id: number; displayName: string; role: string }[]; restricted?: boolean }) | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const load = useCallback(async () => {
    try { setG(await api(`/api/groups/${id}`)); setPosts((await api<{ items: Post[] }>(`/api/feed?groupId=${id}`)).items); } catch (e) { setErr(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!g) return <Spinner />;
  if (g.restricted) return <p className="text-xs text-slate-400">Private group — invitation required.</p>;
  const mod = g.myRole === 'owner' || g.myRole === 'moderator';
  return (
    <div className="space-y-2 border-t border-white/10 pt-2 text-sm">
      <div className="text-xs text-slate-300">{g.memberList?.map((m) => <span key={m.id} className="me-2">{m.displayName} <span className="text-slate-500">({m.role})</span>
        {g.myRole === 'owner' && m.role === 'member' && <button className="text-aqua-300 ms-1" onClick={() => api(`/api/groups/${id}/role`, { method: 'POST', body: { userId: m.id, role: 'moderator' } }).then(load)}>↑mod</button>}
        {mod && m.role !== 'owner' && m.id !== me?.id && <button className="text-red-300 ms-1" onClick={() => api(`/api/groups/${id}/remove`, { method: 'POST', body: { userId: m.id } }).then(load)}>✕</button>}</span>)}</div>
      {mod && <button className="text-xs text-aqua-300" onClick={() => { const uid = prompt('User ID to invite'); if (uid) api(`/api/groups/${id}/invite`, { method: 'POST', body: { userId: +uid } }).then(load).catch(setErr); }}>＋ invite user by ID</button>}
      {me && g.myRole && g.myRole !== 'invited' && <form className="flex gap-1" onSubmit={async (e) => { e.preventDefault(); try { await api('/api/posts', { method: 'POST', body: { text, visibility: 'public', groupId: id } }); setText(''); load(); } catch (x) { setErr(x); } }}>
        <input className="field text-xs" dir="auto" placeholder="Post to group" value={text} onChange={(e) => setText(e.target.value)} aria-label="Post to group" /><Btn variant="chip" type="submit">↵</Btn></form>}
      {posts.map((p) => <PostCard key={p.id} post={p} me={me} onChange={load} />)}
      {err != null && <ErrorBox error={err} />}
    </div>
  );
}

function CommunityMap() {
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [items, setItems] = useState<{ type: string; id: number; title: string; lon: number; lat: number }[]>([]);
  const [kind, setKind] = useState<'all' | 'event' | 'route'>('all');
  useEffect(() => { api<{ items: typeof items }>('/api/community/map').then((r) => setItems(r.items)).catch(() => {}); }, []);
  useEffect(() => {
    if (!engine) return; const m = engine.map;
    if (!m.getSource('comm')) {
      m.addSource('comm', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 40 });
      m.addLayer({ id: 'comm-c', type: 'circle', source: 'comm', filter: ['has', 'point_count'], paint: { 'circle-color': '#14d3c8', 'circle-radius': 16, 'circle-opacity': 0.8 } });
      m.addLayer({ id: 'comm-n', type: 'symbol', source: 'comm', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 } });
      m.addLayer({ id: 'comm-p', type: 'circle', source: 'comm', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get', 'type'], 'event', '#ffb347', '#38d9ff'], 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
      m.addLayer({ id: 'comm-l', type: 'symbol', source: 'comm', filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['get', 'title'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 } });
    }
    (m.getSource('comm') as GeoJSONSource).setData({ type: 'FeatureCollection', features: items.filter((i) => kind === 'all' || i.type === kind).map((i) => ({ type: 'Feature', properties: i, geometry: { type: 'Point', coordinates: [i.lon, i.lat] } })) });
  }, [engine, items, kind]);
  return (
    <div className="space-y-2">
      <div className="flex gap-1">{(['all', 'event', 'route'] as const).map((k) => <button key={k} className={`btn btn-chip text-xs ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>{k}</button>)}<span className="text-xs text-slate-400 self-center ms-2">{items.length} public items · private locations are never shown</span></div>
      <MapView className="h-[60vh] rounded-2xl overflow-hidden" center={[10, 47]} zoom={4} pitch={0} mode="flat" onReady={setEngine} />
    </div>
  );
}

function Profile({ me, onChange }: { me: User; onChange: () => void }) {
  const [f, setF] = useState({ displayName: me.displayName, bio: me.bio ?? '', country: me.country ?? '', region: me.region ?? '', level: me.level ?? 'beginner', interests: (me.interests ?? []).join(', '), profilePublic: !!me.profilePublic });
  const [err, setErr] = useState<unknown>(null);
  const [ok, setOk] = useState(false);
  const save = async (extra: Record<string, unknown> = {}) => {
    setErr(null); setOk(false);
    try { await api('/api/me', { method: 'PATCH', body: { ...f, interests: f.interests.split(',').map((s) => s.trim()).filter(Boolean), ...extra } }); setOk(true); onChange(); } catch (e) { setErr(e); }
  };
  return (
    <Glass className="p-4 max-w-xl space-y-2">
      <div className="text-xs text-slate-400">ID #{me.id} · {me.email} (never shown to others) · {me.followers} followers · {me.following} following · {me.completedJourneys} journeys</div>
      {me.avatar && <img src={apiUrl(me.avatar)} alt="" className="w-16 h-16 rounded-full object-cover" />}
      <input className="field" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} aria-label="Display name" />
      <textarea className="field" dir="auto" placeholder="Bio" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} aria-label="Bio" />
      <div className="grid grid-cols-2 gap-2"><input className="field" placeholder="Country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} aria-label="Country" /><input className="field" placeholder="Region (optional)" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} aria-label="Region" /></div>
      <select className="field" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} aria-label="Level">{['beginner', 'intermediate', 'experienced', 'expert'].map((l) => <option key={l}>{l}</option>)}</select>
      <input className="field" placeholder="Interests (comma separated)" value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} aria-label="Interests" />
      <Toggle checked={f.profilePublic} onChange={(v) => setF({ ...f, profilePublic: v })} label="Public profile" />
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-ghost cursor-pointer text-xs">Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => e.target.files?.[0] && save({ avatar: await toDataUrl(e.target.files[0]) })} /></label>
        <label className="btn btn-ghost cursor-pointer text-xs">Cover image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => e.target.files?.[0] && save({ cover: await toDataUrl(e.target.files[0]) })} /></label>
        <Btn variant="primary" onClick={() => save()}>Save</Btn>
        <Btn variant="danger" onClick={async () => { const pw = prompt('Password to delete your account permanently'); if (pw) { try { await api('/api/me', { method: 'DELETE', body: { password: pw } }); onChange(); } catch (e) { setErr(e); } } }}>Delete account</Btn>
      </div>
      {ok && <p className="text-xs text-aqua-300">✓</p>}{err != null && <ErrorBox error={err} />}
    </Glass>
  );
}

function Notifications() {
  const [n, setN] = useState<{ items: { id: number; kind: string; data: Record<string, unknown>; read: boolean; createdAt: string }[]; unread: number } | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => { api<typeof n>('/api/notifications').then(setN); api<Record<string, boolean>>('/api/notifications/prefs').then(setPrefs); api('/api/notifications/read', { method: 'POST' }); }, []);
  const kinds = ['follow', 'comment', 'reaction', 'group_invite', 'join_request', 'join_accepted', 'event_changed', 'event_upcoming'];
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_280px]">
      <Glass className="p-3">{!n ? <Spinner /> : n.items.length === 0 ? <Empty>No notifications.</Empty> : <ul className="text-sm divide-y divide-white/5">{n.items.map((x) => <li key={x.id} className={`py-2 ${x.read ? 'text-slate-400' : 'text-white'}`}>{x.kind} · {String(x.data.name ?? x.data.title ?? '')} <span className="text-xs text-slate-500">{new Date(x.createdAt).toLocaleString()}</span></li>)}</ul>}</Glass>
      <Glass className="p-3"><div className="field-label">Preferences</div>{kinds.map((k) => <Toggle key={k} checked={prefs[k] !== false} label={k} onChange={(v) => { const p = { ...prefs, [k]: v }; setPrefs(p); api('/api/notifications/prefs', { method: 'PUT', body: p }); }} />)}</Glass>
    </div>
  );
}

function Guidelines() {
  return (
    <Glass className="p-4 max-w-2xl text-sm space-y-2">
      <h2 className="font-display text-white">Community guidelines</h2>
      <ul className="list-disc ps-5 space-y-1 text-slate-300">
        <li>Be respectful. No harassment, hate speech or threats.</li>
        <li>Only share photos, videos and music you own or are allowed to share.</li>
        <li>Never post other people's location, contact details or private information.</li>
        <li>Do not claim that a trail is safe or open without an official source.</li>
        <li>Organizers are not verified by SSBN. Participants are responsible for their own safety and for checking conditions.</li>
        <li>Events with minors: users under 18 cannot join adults-only events and cannot organise events; guardians should accompany minors.</li>
        <li>Report content that breaks these rules. Reports are reviewed by moderators; repeated abuse leads to removal.</li>
      </ul>
    </Glass>
  );
}

export { ApiError };
