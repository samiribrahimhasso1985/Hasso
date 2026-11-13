import { useCallback, useEffect, useState } from 'react'
import { api, Clip, DavinciStatus, Media, Overview, Project, Resources, Task } from '../services/api'
import { AI } from '../services/useAI'
import { Lang } from '../i18n'
import { ErrorBox } from '../components/ui'
import { Assistant, AIEngine, Davinci, L, MediaPool, Preview, ProjectOverview, ResourcesW, Tasks, Timeline, W } from '../components/widgets'

export default function Dashboard({ lang, ai, projects, pid, go }: { lang: Lang; ai: AI; projects: Project[]; pid: number | null; go: (p: string) => void }) {
  const [ov, setOv] = useState<Overview | null>(null); const [media, setMedia] = useState<Media[]>([]); const [sel, setSel] = useState<Media | null>(null)
  const [tl, setTl] = useState<{ clips: Clip[]; duration: number; tracks: string[] }>({ clips: [], duration: 0, tracks: ['V1', 'V2', 'V3', 'A1', 'A2'] })
  const [tasks, setTasks] = useState<Task[]>([]); const [res, setRes] = useState<Resources | null>(null); const [dv, setDv] = useState<DavinciStatus | null>(null)
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [dvMsg, setDvMsg] = useState('')
  const load = useCallback(async () => {
    if (!pid) { setOv(null); setMedia([]); return }
    try { const [o, m, t] = await Promise.all([api.overview(pid), api.media(pid), api.timeline(pid)]); setOv(o); setMedia(m); setTl(t); setErr('') } catch (e: any) { setErr(e.message) }
  }, [pid])
  useEffect(() => { load() }, [load])
  useEffect(() => { const f = () => api.tasks().then(setTasks).catch(() => { }); f(); const i = setInterval(f, 1500); return () => clearInterval(i) }, [])
  useEffect(() => { const f = () => api.resources().then(setRes).catch(() => setRes(null)); f(); const i = setInterval(f, 3000); return () => clearInterval(i) }, [])
  const loadDv = () => api.davinci().then(setDv).catch(() => setDv(null))
  useEffect(() => { loadDv() }, [])
  const doneId = tasks[0]?.status === 'done' ? tasks[0].id : 0
  useEffect(() => { if (doneId) load() }, [doneId, load])
  const guard = (fn: () => Promise<unknown>) => async () => { try { setErr(''); await fn(); await load() } catch (e: any) { setErr(e.message) } }
  if (err && !ov && !projects.length) return <ErrorBox msg={err} />
  return (
    <div className="space-y-4">
      {err && <ErrorBox msg={err} />}
      {!projects.length && <W title={L(lang, 'ابدأ هنا', 'Get started')}><p className="mb-2 text-sm">{L(lang, 'أنشئ مشروعك الأول ثم استورد وسائطك.', 'Create your first project, then import media.')}</p><button className="btn" onClick={() => go('projects')}>{L(lang, 'مشروع جديد', 'New project')}</button></W>}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_1fr]">
        <ProjectOverview lang={lang} ov={ov} msg={msg} onOpen={() => go('projects')} onExport={guard(async () => setMsg((await api.exportEdl(pid!)).path))} />
        <AIEngine lang={lang} ai={ai} onManage={() => go('aiModels')} />
        <Preview lang={lang} media={sel} target={ov?.target} />
        <Assistant lang={lang} ai={ai} pid={pid} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Tasks lang={lang} tasks={tasks} onCancel={id => api.cancelTask(id).catch(() => { })} />
        <W title={L(lang, 'المشاريع الأخيرة', 'Recent Projects')} right={<button className="text-xs text-gold" onClick={() => go('projects')}>{L(lang, 'عرض الكل', 'View all')}</button>}>
          {projects.slice(0, 4).map(p => <div key={p.id} className="text-sm opacity-90">{p.name}<span className="opacity-50"> · {p.updated_at.slice(0, 10)}</span></div>)}{!projects.length && '—'}</W>
        <Davinci lang={lang} d={dv} msg={dvMsg} canSend={!!pid && tl.clips.length > 0} onRefresh={loadDv}
          onSend={async () => { if (!pid || !confirm(L(lang, 'سيُرسل التايم لاين إلى DaVinci Resolve. متابعة؟', 'Send this timeline to DaVinci Resolve?'))) return; try { const r = await api.davinciTimeline(pid); setDvMsg(`✔ ${r.timeline}: ${r.clips} clips (verified in Resolve)`) } catch (e: any) { setDvMsg(`✖ ${e.message}`) } }} />
        <ResourcesW lang={lang} r={res} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Timeline lang={lang} clips={tl.clips} duration={tl.duration} tracks={tl.tracks} onDelete={id => guard(() => api.delClip(pid!, id))()} />
        <MediaPool lang={lang} items={media} selected={sel?.id ?? null} onSelect={setSel}
          onAdd={m => guard(() => api.addClip(pid!, m.id, m.kind === 'audio' ? 'A1' : 'V1'))()} onAnalyze={m => guard(() => api.analyze(m.id))()} />
      </div>
    </div>
  )
}
