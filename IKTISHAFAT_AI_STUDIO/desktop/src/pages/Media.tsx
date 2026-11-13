import { useEffect, useState } from 'react'
import { api, Media as M, Project } from '../services/api'
import { Lang, t } from '../i18n'
import { Card, ErrorBox } from '../components/ui'
export default function Media({ lang }: { lang: Lang }) {
  const [projects, setProjects] = useState<Project[]>([]); const [pid, setPid] = useState<number | null>(null)
  const [items, setItems] = useState<M[]>([]); const [path, setPath] = useState(''); const [kind, setKind] = useState(''); const [q, setQ] = useState('')
  const [err, setErr] = useState(''); const [note, setNote] = useState('')
  useEffect(() => { api.projects().then(p => { setProjects(p); if (p[0]) setPid(p[0].id) }).catch(e => setErr(e.message)) }, [])
  const load = () => pid && api.media(pid, kind, q).then(setItems).catch(e => setErr(e.message))
  useEffect(() => { load() }, [pid, kind, q])
  const pick = async () => { const f = await (window as any).studio?.pickFile?.(); if (f) setPath(f) }
  const doImport = async () => { if (!pid) return; setErr(''); setNote(''); try { const m = await api.importMedia(pid, path); if (m.duplicate) setNote(t(lang, 'duplicate')); setPath(''); load() } catch (e: any) { setErr(e.message) } }
  if (!projects.length && !err) return <p>{t(lang, 'noProject')}</p>
  return (
    <div className="space-y-4">
      {err && <ErrorBox msg={err} />}{note && <div className="text-gold">{note}</div>}
      <Card title={t(lang, 'importFile')}>
        <div className="grid gap-2 md:grid-cols-[auto_1fr_auto_auto]">
          <select className="input" aria-label="project" value={pid ?? ''} onChange={e => setPid(Number(e.target.value))}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input className="input" dir="ltr" aria-label="path" placeholder={t(lang, 'filePath')} value={path} onChange={e => setPath(e.target.value)} />
          <button className="btn-ghost" onClick={pick}>{t(lang, 'pickFile')}</button>
          <button className="btn" disabled={!path} onClick={doImport}>{t(lang, 'import')}</button>
        </div>
      </Card>
      <div className="flex gap-2">
        <input className="input max-w-xs" placeholder={t(lang, 'search')} value={q} onChange={e => setQ(e.target.value)} />
        <select className="input max-w-xs" value={kind} onChange={e => setKind(e.target.value)}><option value="">{t(lang, 'all')}</option>{['video', 'audio', 'image', 'subtitle', 'project'].map(k => <option key={k}>{k}</option>)}</select>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(m => (
          <Card key={m.id}>
            <div className="break-all text-sm" dir="ltr">{m.path.split(/[\\/]/).pop()}</div>
            <div className="mt-1 text-xs opacity-70" dir="ltr">{m.kind} · {m.width ? `${m.width}x${m.height}` : '—'} · {m.fps ? `${m.fps} fps` : '—'} · {m.duration ? `${m.duration}s` : '—'} · {m.codec ?? '—'} · {m.meta_source}</div>
            {m.status === 'missing' && <div className="text-red-300">{t(lang, 'missing')}</div>}
          </Card>))}
      </div>
    </div>
  )
}
