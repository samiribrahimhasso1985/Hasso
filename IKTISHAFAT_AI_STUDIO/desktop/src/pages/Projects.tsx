import { useEffect, useState } from 'react'
import { api, Project } from '../services/api'
import { Lang, t } from '../i18n'
import { Card, ErrorBox } from '../components/ui'
export default function Projects({ lang, onChange }: { lang: Lang; onChange: () => void }) {
  const [list, setList] = useState<Project[]>([]); const [name, setName] = useState(''); const [desc, setDesc] = useState('')
  const [err, setErr] = useState(''); const [info, setInfo] = useState('')
  const load = () => api.projects().then(setList).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const run = async (fn: () => Promise<any>) => { setErr(''); setInfo(''); try { const r = await fn(); if (r?.backup) setInfo(r.backup); await load(); onChange() } catch (e: any) { setErr(e.message) } }
  return (
    <div className="space-y-4">
      {err && <ErrorBox msg={err} />}{info && <div className="text-sm text-emerald-300" dir="ltr">{info}</div>}
      <Card title={t(lang, 'newProject')}>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="input" aria-label="name" placeholder={t(lang, 'name')} value={name} onChange={e => setName(e.target.value)} />
          <input className="input" aria-label="description" placeholder={t(lang, 'description')} value={desc} onChange={e => setDesc(e.target.value)} />
          <button className="btn" disabled={!name.trim()} onClick={() => run(async () => { await api.createProject({ name: name.trim(), description: desc, language: lang }); setName(''); setDesc('') })}>{t(lang, 'create')}</button>
        </div>
      </Card>
      {list.map(p => (
        <Card key={p.id}>
          <div className="flex items-center justify-between gap-2">
            <div><div className="text-lg font-bold">{p.name}</div><div className="text-sm opacity-70">{p.description}</div><div className="text-xs opacity-50" dir="ltr">{p.folder}</div></div>
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
