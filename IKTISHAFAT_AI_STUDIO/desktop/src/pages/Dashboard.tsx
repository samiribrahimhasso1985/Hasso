import { useEffect, useState } from 'react'
import { api, Dashboard as D } from '../services/api'
import { Lang, t } from '../i18n'
import { Card, Badge, ErrorBox } from '../components/ui'
export default function Dashboard({ lang }: { lang: Lang }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState('')
  const load = () => api.dashboard().then(setD).catch(e => setErr(String(e.message)))
  useEffect(() => { load() }, [])
  if (err) return <ErrorBox msg={`${t(lang, 'backendOff')}: ${err}`} />
  if (!d) return <p>…</p>
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card title={t(lang, 'current')}>{d.current_project ? <><div className="text-lg">{d.current_project.name}</div><div className="text-sm opacity-70">{t(lang, 'stage')}: {d.current_project.stage}</div></> : t(lang, 'noProject')}</Card>
      <Card title="DaVinci Resolve"><Badge ok={d.davinci === 'connected_ready'}>{d.davinci}</Badge></Card>
      <Card title={t(lang, 'aiModels')}><Badge ok={d.local_ai}>{d.local_ai ? 'Ollama' : t(lang, 'notDetected')}</Badge></Card>
      <Card title={t(lang, 'media')}>{Object.keys(d.media_counts).length ? Object.entries(d.media_counts).map(([k, v]) => <div key={k}>{k}: {v}</div>) : '—'}{d.media_missing > 0 && <div className="text-red-300">{t(lang, 'missing')}: {d.media_missing}</div>}</Card>
      <Card title={t(lang, 'storage')}><div dir="ltr" className="text-sm">{d.storage.data_dir}</div>{d.storage.free_gb} GB {t(lang, 'free')}</Card>
      <Card title={t(lang, 'recent')}>{d.recent_projects.map(p => <div key={p.id}>{p.name}</div>)}{!d.recent_projects.length && '—'}</Card>
      <div className="md:col-span-2 xl:col-span-3"><Card title={t(lang, 'tasks')}>{d.tasks.map((x, i) => <div key={i} className="text-sm" dir="ltr">{x.at.slice(0, 19)} · {x.name} · {x.status} · {x.detail}</div>)}{!d.tasks.length && '—'}</Card></div>
    </div>
  )
}
