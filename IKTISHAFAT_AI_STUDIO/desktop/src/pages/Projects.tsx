import { useEffect, useState } from 'react'
import { api, Formats, Project } from '../services/api'
import { Lang, t } from '../i18n'
import { L } from '../components/widgets'
import { Card, ErrorBox } from '../components/ui'
export default function Projects({ lang, onChange }: { lang: Lang; onChange: () => void }) {
  const [list, setList] = useState<Project[]>([]); const [name, setName] = useState(''); const [desc, setDesc] = useState('')
  const [err, setErr] = useState(''); const [info, setInfo] = useState('')
  const [fm, setFm] = useState<Formats | null>(null); const [fid, setFid] = useState('hd169'); const [fps, setFps] = useState(25); const [cw, setCw] = useState(1920); const [ch, setCh] = useState(1080)
  const load = () => api.projects().then(setList).catch(e => setErr(e.message))
  useEffect(() => { load(); api.formats().then(setFm).catch(() => { }) }, [])
  const run = async (fn: () => Promise<any>) => { setErr(''); setInfo(''); try { const r = await fn(); if (r?.backup) setInfo(r.backup); await load(); onChange() } catch (e: any) { setErr(e.message) } }
  return (
    <div className="space-y-4">
      {err && <ErrorBox msg={err} />}{info && <div className="text-sm text-ok" dir="ltr">{info}</div>}
      <Card title={t(lang, 'newProject')}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="input" aria-label="name" placeholder={t(lang, 'name')} value={name} onChange={e => setName(e.target.value)} />
          <input className="input" aria-label="description" placeholder={t(lang, 'description')} value={desc} onChange={e => setDesc(e.target.value)} />
          <button className="btn" disabled={!name.trim()} onClick={() => run(async () => { await api.createProject({ name: name.trim(), description: desc, language: lang, format_id: fid, fps, ...(fid === 'custom' ? { width: cw, height: ch } : {}) }); setName(''); setDesc('') })}>{t(lang, 'create')}</button>
        </div>
        {fm && <div className="mt-3">
          <div className="mb-1 text-sm opacity-70">{L(lang, 'صيغة الفيديو', 'Video format')}</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="video format">
            {[...fm.presets, { id: 'custom', aspect: L(lang, 'مخصص', 'Custom'), width: cw, height: ch, use: '' }].map(p => {
              const k = 34 / Math.max(p.width, p.height)
              return <button key={p.id} role="radio" aria-checked={fid === p.id} onClick={() => setFid(p.id)} className={`flex w-36 items-center gap-2 rounded-lg border p-2 text-start text-xs ${fid === p.id ? 'border-gold bg-gold/15' : 'border-warm/20'}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center"><span className="block border border-gold/70 bg-gold/10" style={{ width: p.width * k, height: p.height * k }} /></span>
                <span><b className="text-sm">{p.aspect}</b><br /><span dir="ltr">{p.width}×{p.height}</span><br /><span className="opacity-60">{p.use}</span></span></button>
            })}
          </div>
          {fid === 'custom' && <div className="mt-2 flex items-center gap-2" dir="ltr"><input className="input max-w-[7rem]" type="number" aria-label="width" value={cw} onChange={e => setCw(+e.target.value)} />×<input className="input max-w-[7rem]" type="number" aria-label="height" value={ch} onChange={e => setCh(+e.target.value)} /></div>}
          <div className="mt-2 flex items-center gap-2 text-sm"><span className="opacity-70">FPS</span><select className="input max-w-[7rem]" aria-label="fps" value={fps} onChange={e => setFps(+e.target.value)}>{fm.fps.map(f => <option key={f}>{f}</option>)}</select></div>
        </div>}
      </Card>
      {list.map(p => (
        <Card key={p.id}>
          <div className="flex items-center justify-between gap-2">
            <div><div className="text-lg font-bold">{p.name}</div><div className="text-sm opacity-70">{p.description}</div><div className="text-xs text-gold" dir="ltr">{p.aspect} · {p.width}×{p.height} · {p.fps} fps</div><div className="text-xs opacity-50" dir="ltr">{p.folder}</div></div>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => run(() => api.backupProject(p.id))}>{t(lang, 'backup')}</button>
              <button className="btn-ghost" onClick={() => confirm(t(lang, 'confirmDel')) && run(() => api.deleteProject(p.id))}>{t(lang, 'del')}</button>
            </div>
          </div>
        </Card>))}
      {!list.length && <p>{t(lang, 'noProject')}</p>}
    </div>
  )
}
