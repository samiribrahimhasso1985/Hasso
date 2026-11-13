import { ReactNode, useEffect, useRef, useState } from 'react'
import { api, Clip, DavinciStatus, Media, Overview, Resources, Task } from '../services/api'
import { AI } from '../services/useAI'
import { Lang } from '../i18n'

export const L = (lang: Lang, ar: string, en: string) => (lang === 'ar' ? ar : en)
export const W = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <section className="card flex min-h-0 flex-col"><div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-warm">{title}</h3>{right}</div><div className="min-h-0 flex-1">{children}</div></section>)
const Dot = ({ on }: { on: boolean | null }) => <span className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-ok' : on === false ? 'bg-danger' : 'bg-warm/40'}`} />
export const fmt = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = Math.floor(s % 60); return [h, m, x].map(n => String(n).padStart(2, '0')).join(':') }

export function ProjectOverview({ lang, ov, onOpen, onExport, msg }: { lang: Lang; ov: Overview | null; onOpen: () => void; onExport: () => void; msg: string }) {
  return (
    <W title={L(lang, 'نظرة على المشروع', 'Project Overview')}>
      {!ov ? <p className="opacity-70">{L(lang, 'لا يوجد مشروع', 'No project yet')}</p> : (
        <div className="flex gap-3">
          <div className="h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-ink">{ov.thumb_media_id && <img alt="" className="h-full w-full object-cover" src={api.thumbUrl(ov.thumb_media_id)} />}</div>
          <div className="min-w-0 text-sm"><div className="truncate text-lg font-bold">{ov.project.name}</div>
            <div className="opacity-80">{L(lang, 'المدة', 'Duration')}: {fmt(ov.timeline_duration)}</div>
            <div className="opacity-80">{L(lang, 'الدقة', 'Resolution')}: <bdi dir="ltr">{ov.resolution ?? '—'}</bdi></div>
            <div className="opacity-80">FPS: {ov.fps ?? '—'}</div>
            <div className="text-gold" dir="ltr">{L(lang, 'الصيغة المستهدفة', 'Target')}: {ov.target.aspect} · {ov.target.width}×{ov.target.height} · {ov.target.fps}</div>
            <div className="opacity-60">{L(lang, 'آخر تعديل', 'Modified')}: {ov.project.updated_at.slice(0, 16).replace('T', ' ')}</div></div>
        </div>)}
      <div className="mt-3 flex gap-2"><button className="btn" onClick={onOpen}>{L(lang, 'فتح المشروع', 'Open Project')}</button>
        <button className="btn-ghost" disabled={!ov || !ov.clip_count} onClick={onExport}>{L(lang, 'تصدير EDL', 'Export EDL')}</button></div>
      {msg && <div className="mt-2 break-all text-xs text-gold" dir="ltr">{msg}</div>}
    </W>)
}

export function AIEngine({ lang, ai, onManage }: { lang: Lang; ai: AI; onManage: () => void }) {
  const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  const test = async (p: string) => { setBusy(p); setErr(''); try { const r = await api.aiTest(p); if (!r.ok) setErr(`${p}: ${r.error}`); await ai.refresh() } finally { setBusy('') } }
  const cur = ai.providers.find(p => p.id === ai.active)
  return (
    <W title={L(lang, 'حالة محرك الذكاء الاصطناعي', 'AI Engine Status')} right={<button className="text-xs text-gold" onClick={onManage}>{L(lang, 'إدارة المفاتيح', 'Manage keys')}</button>}>
      <div className="space-y-1">
        {ai.providers.map(p => (
          <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm ${ai.active === p.id ? 'bg-gold/15' : ''}`}>
            <input type="radio" name="prov" checked={ai.active === p.id} onChange={() => ai.setActive(p.id)} />
            <Dot on={p.reachable} /><span className="flex-1">{p.label}</span>
            <span className="text-xs opacity-60">{p.reachable ? L(lang, 'متصل', 'Online') : p.configured ? (p.id === 'ollama' ? L(lang, 'غير متصل', 'Offline') : L(lang, 'مفتاح محفوظ', 'Key saved')) : L(lang, 'بلا مفتاح', 'No key')}</span>
            {p.id !== 'ollama' && <button className="btn-ghost !px-2 !py-0.5 text-xs" disabled={!p.configured || busy === p.id} onClick={e => { e.preventDefault(); test(p.id) }}>Test</button>}
          </label>))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm"><span className="opacity-70">{L(lang, 'النموذج', 'Model')}</span>
        <select className="input !py-1" aria-label="model" value={ai.modelFor(ai.active)} onChange={e => ai.setModel(ai.active, e.target.value)}>
          {(cur?.models.length ? cur.models : ['']).map(m => <option key={m} value={m}>{m || L(lang, '— اضغط Test —', '— press Test —')}</option>)}</select></div>
      <label className="mt-2 flex items-center gap-2 text-xs opacity-80"><input type="checkbox" checked={ai.fallback} onChange={e => ai.setFallback(e.target.checked)} />{L(lang, 'التحويل لمزود بديل عند الفشل', 'Fall back to another provider on failure')}</label>
      {err && <div className="mt-1 text-xs text-danger">{err}</div>}
    </W>)
}

export function Preview({ lang, media, target }: { lang: Lang; media: Media | null; target?: { aspect: string; width: number; height: number } }) {
  const [framed, setFramed] = useState(true)
  const box = framed && target && media?.kind === 'video'
  return (
    <W title={`${L(lang, 'المعاينة', 'Preview')}${media ? ' — ' + media.path.split(/[\\/]/).pop() : ''}`}>
      {!media ? <p className="opacity-70">{L(lang, 'اختر ملفاً من مكتبة الوسائط', 'Select a file from the Media Pool')}</p>
        : media.kind === 'video' ? <div>
            <div className="mx-auto overflow-hidden rounded-lg bg-black" style={box ? { aspectRatio: `${target!.width} / ${target!.height}`, maxHeight: '16rem' } : { maxHeight: '16rem' }}>
              <video key={media.id} src={api.mediaUrl(media.id)} controls className={`h-full w-full ${box ? 'object-cover' : 'object-contain'}`} /></div>
            {target && <label className="mt-1 flex items-center gap-2 text-xs opacity-80"><input type="checkbox" checked={framed} onChange={e => setFramed(e.target.checked)} />{L(lang, `عرض بإطار المشروع (${target.aspect})`, `Show in project frame (${target.aspect})`)}
              {media.fit?.status === 'reframe' && <span className="text-gold">{L(lang, `يُقصّ ~${media.fit.crop_percent}%`, `~${media.fit.crop_percent}% cropped`)}</span>}</label>}</div>
        : media.kind === 'audio' ? <audio key={media.id} src={api.mediaUrl(media.id)} controls className="w-full" />
        : media.kind === 'image' ? <img alt="" src={api.mediaUrl(media.id)} className="max-h-72 rounded-lg" /> : <p>{media.kind}</p>}
    </W>)
}

const QUICK = (lang: Lang) => [
  ['🎬', L(lang, 'تحليل المشهد الحالي', 'Analyze the current scene'), L(lang, 'حلّل الوسائط والتايم لاين الحاليين واذكر نقاط القوة والضعف.', 'Analyze the current media and timeline; list strengths and weaknesses.')],
  ['➕', L(lang, 'اقتراح لقطات إضافية', 'Suggest extra shots'), L(lang, 'اقترح لقطات B-roll إضافية تناسب هذا المشروع.', 'Suggest extra B-roll shots that suit this project.')],
  ['🖼️', L(lang, 'إنشاء Storyboard', 'Create a storyboard'), L(lang, 'أنشئ Storyboard مبدئياً (مشهد، وصف، حركة كاميرا، مدة) للمشروع.', 'Draft a storyboard (scene, description, camera move, duration) for this project.')],
  ['🔊', L(lang, 'تحسين الصوت', 'Improve audio'), L(lang, 'اقترح خطوات لتحسين الصوت بناءً على نتائج تحليل الصمت.', 'Suggest audio improvements based on the silence analysis.')],
  ['🎨', L(lang, 'اقتراح تصحيح الألوان', 'Suggest color grading'), L(lang, 'اقترح تصحيحاً لونياً سينمائياً مناسباً لهذا المشروع.', 'Suggest a cinematic color grade for this project.')],
]

export function Assistant({ lang, ai, pid }: { lang: Lang; ai: AI; pid: number | null }) {
  const [log, setLog] = useState<{ role: string; content: string }[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { if (log.length) end.current?.scrollIntoView?.({ block: 'nearest' }) }, [log])
  const send = async (prompt: string) => {
    if (!prompt.trim() || busy) return
    const model = ai.modelFor(ai.active)
    if (!model) { setErr(L(lang, 'اختر مزوداً ونموذجاً (اضغط Test في حالة المحرك).', 'Pick a provider and model (press Test in AI Engine).')); return }
    setErr(''); setBusy(true); const history = log
    setLog([...log, { role: 'user', content: prompt }]); setText('')
    try {
      const fb: Record<string, string> = {}
      ai.providers.filter(p => p.configured && p.id !== ai.active && ai.modelFor(p.id)).forEach(p => { fb[p.id] = ai.modelFor(p.id) })
      const r = await api.assist({ project_id: pid, provider: ai.active, model, prompt, history, allow_fallback: ai.fallback, fallback_models: fb })
      setLog(l => [...l, { role: 'assistant', content: r.text + (r.fallback_used ? `\n\n(${r.provider})` : '') }])
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <W title={L(lang, 'مساعد الذكاء الاصطناعي', 'AI Assistant')}>
      <div className="flex h-72 flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto text-sm">
          {!log.length && QUICK(lang).map(([i, label, prompt]) => <button key={label} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-gold/10" onClick={() => send(prompt)}><span>{i}</span>{label}</button>)}
          {log.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-lg p-2 ${m.role === 'user' ? 'bg-gold/15' : 'bg-ink'}`}>{m.content}</div>)}
          {busy && <div className="opacity-60">…</div>}<div ref={end} />
        </div>
        {err && <div role="alert" className="mb-1 text-xs text-danger">{err}</div>}
        <div className="mt-1 flex gap-2"><input className="input" aria-label="assistant-input" value={text} placeholder={L(lang, 'اكتب طلبك هنا…', 'Type your request…')} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(text)} />
          <button className="btn" disabled={busy || !text.trim()} onClick={() => send(text)}>➤</button></div>
        <div className="mt-1 text-[10px] opacity-50">{L(lang, 'يُرسل النص وأسماء الملفات فقط — لا يُرسل أي فيديو.', 'Only text and file names are sent — never video.')}</div>
      </div>
    </W>)
}

export function Ring({ pct, label, sub }: { pct: number | null; label: string; sub?: string }) {
  const v = pct ?? 0, r = 26, c = 2 * Math.PI * r
  return (<div className="text-center"><svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label} ${pct ?? 'n/a'}`}><circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
    <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--c-gold))" strokeWidth="6" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 32 32)" strokeLinecap="round" />
    <text x="32" y="36" textAnchor="middle" fontSize="13" fill="currentColor">{pct === null ? 'n/a' : `${v}%`}</text></svg><div className="text-xs">{label}</div>{sub && <div className="text-[10px] opacity-50">{sub}</div>}</div>)
}

export function Tasks({ lang, tasks, onCancel }: { lang: Lang; tasks: Task[]; onCancel: (id: number) => void }) {
  const t = tasks[0]
  return (
    <W title={L(lang, 'مهام المعالجة', 'Processing Tasks')}>
      {!t ? <p className="text-sm opacity-70">{L(lang, 'لا مهام قيد التنفيذ. حلّل ملفاً من Media Pool.', 'No tasks. Analyze a file from the Media Pool.')}</p> : (
        <div className="flex items-center gap-3"><Ring pct={Math.round(t.progress * 100)} label="" />
          <div className="min-w-0 flex-1 text-sm"><div className="font-semibold">{t.name} — {t.status}</div><div className="truncate opacity-70">{t.detail}</div>
            {t.status === 'running' && <>{t.remaining_s != null && <div className="text-xs opacity-60">{fmt(t.remaining_s)} {L(lang, 'متبقي', 'remaining')}</div>}<button className="btn-ghost mt-1 !py-0.5 text-xs" onClick={() => onCancel(t.id)}>{L(lang, 'إلغاء', 'Cancel')}</button></>}</div></div>)}
    </W>)
}

export function Davinci({ lang, d, canSend, onSend, onRefresh, msg }: { lang: Lang; d: DavinciStatus | null; canSend: boolean; onSend: () => void; onRefresh: () => void; msg: string }) {
  const c = d?.connection.connected
  return (
    <W title={L(lang, 'تكامل DaVinci Resolve', 'DaVinci Resolve Integration')}>
      <div className="flex items-center gap-2 text-sm"><Dot on={!!c} /><b>{c ? `${L(lang, 'متصل', 'Connected')} — ${d?.connection.version}` : L(lang, 'غير متصل', 'Not connected')}</b></div>
      {!c && <div className="mt-1 text-xs opacity-70">{d?.connection.error ?? d?.note}</div>}
      <div className="mt-2 flex gap-2"><button className="btn-ghost" onClick={onRefresh}>{L(lang, 'تحديث', 'Refresh')}</button>
        <button className="btn" disabled={!c || !canSend} title={!c ? L(lang, 'يتطلب اتصالاً حقيقياً بـ Resolve', 'Requires a live Resolve connection') : ''} onClick={onSend}>{L(lang, 'إنشاء Timeline في Resolve', 'Create Timeline in Resolve')}</button></div>
      {msg && <div className="mt-2 text-xs text-gold">{msg}</div>}
    </W>)
}

export function ResourcesW({ lang, r }: { lang: Lang; r: Resources | null }) {
  return <W title={L(lang, 'موارد النظام', 'System Resources')}><div className="flex justify-around pt-2"><Ring pct={r?.cpu ?? null} label="CPU" /><Ring pct={r?.ram ?? null} label="RAM" /><Ring pct={r?.gpu ?? null} label="GPU" sub={r && r.gpu === null ? L(lang, 'غير متاح', 'unavailable') : undefined} /></div></W>
}

const TRACK_COLORS: Record<string, string> = { V: 'bg-gold/30', A: 'bg-ok/40' }
export function Timeline({ lang, clips, duration, tracks, onDelete }: { lang: Lang; clips: Clip[]; duration: number; tracks: string[]; onDelete: (id: number) => void }) {
  const total = Math.max(duration, 1)
  return (
    <W title={`Timeline — ${fmt(duration)}`}>
      {!clips.length && <p className="mb-2 text-sm opacity-70">{L(lang, 'التايم لاين فارغ. أضف مقاطع من Media Pool (＋).', 'Timeline is empty. Add clips from the Media Pool (＋).')}</p>}
      <div className="space-y-1" dir="ltr">
        {[...tracks].reverse().map(tr => (
          <div key={tr} className="flex items-center gap-2"><div className="w-8 shrink-0 text-xs opacity-70">{tr}</div>
            <div className="relative h-10 flex-1 rounded bg-ink">
              {clips.filter(c => c.track === tr).map(c => (
                <div key={c.id} title={`${c.name} (${c.duration}s)`} style={{ left: `${(c.start / total) * 100}%`, width: `${(c.duration / total) * 100}%` }}
                  className={`group absolute top-0 flex h-full items-center overflow-hidden rounded border border-warm/25 px-1 text-[10px] ${TRACK_COLORS[tr[0]]}`}>
                  {c.kind !== 'audio' && <img alt="" className="mr-1 h-full w-8 object-cover" src={api.thumbUrl(c.media_id)} />}<span className="truncate">{c.name}</span>
                  <button aria-label="remove clip" className="absolute right-0 top-0 hidden bg-black/70 px-1 group-hover:block" onClick={() => onDelete(c.id)}>×</button></div>))}
            </div></div>))}
      </div>
    </W>)
}

export function MediaPool({ lang, items, selected, onSelect, onAdd, onAnalyze }: { lang: Lang; items: Media[]; selected: number | null; onSelect: (m: Media) => void; onAdd: (m: Media) => void; onAnalyze: (m: Media) => void }) {
  return (
    <W title="Media Pool">
      {!items.length && <p className="text-sm opacity-70">{L(lang, 'استورد ملفات من مكتبة الوسائط.', 'Import files from Media Library.')}</p>}
      <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto">
        {items.map(m => (
          <div key={m.id} className={`rounded-lg border p-1 text-xs ${selected === m.id ? 'border-gold' : 'border-warm/15'}`}>
            <button className="block w-full text-start" onClick={() => onSelect(m)}>
              <div className="flex h-12 items-center justify-center overflow-hidden rounded bg-ink">{m.kind === 'video' || m.kind === 'image' ? <img alt="" className="h-full w-full object-cover" src={api.thumbUrl(m.id)} /> : <span className="text-xl">{m.kind === 'audio' ? '🎵' : '📄'}</span>}</div>
              <div className="mt-1 truncate" dir="ltr">{m.path.split(/[\\/]/).pop()}</div></button>
            {m.fit?.status === 'reframe' && <div className="text-[10px] text-gold">{L(lang, `إعادة تأطير ${m.fit.crop_percent}%`, `reframe ${m.fit.crop_percent}%`)}</div>}
            <div className="mt-1 flex gap-1">{['video', 'audio', 'image'].includes(m.kind) && <button className="btn-ghost !px-1.5 !py-0 text-xs" aria-label="add to timeline" onClick={() => onAdd(m)}>＋</button>}
              {['video', 'audio'].includes(m.kind) && <button className="btn-ghost !px-1.5 !py-0 text-xs" onClick={() => onAnalyze(m)}>{L(lang, 'تحليل', 'Analyze')}</button>}</div>
          </div>))}
      </div>
    </W>)
}
