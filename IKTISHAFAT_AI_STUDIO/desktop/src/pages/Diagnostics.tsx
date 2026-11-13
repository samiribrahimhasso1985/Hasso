import { useEffect, useState } from 'react'
import { api, Diagnostics as D } from '../services/api'
import { Lang, t } from '../i18n'
import { Card, Badge, ErrorBox } from '../components/ui'
export default function Diagnostics({ lang, only }: { lang: Lang; only?: 'davinci' | 'local_ai' }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState('')
  const load = () => api.diagnostics().then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  if (err) return <ErrorBox msg={err} />
  if (!d) return <p>…</p>
  const rows: [string, boolean, string][] = [
    ['Python', true, d.platform.python], ['FFmpeg', !!d.ffmpeg.path, d.ffmpeg.version ?? t(lang, 'notDetected')],
    ['FFprobe', !!d.ffprobe.path, d.ffprobe.version ?? t(lang, 'notDetected')],
    ['DaVinci Resolve', d.davinci.status === 'connected_ready', `${d.davinci.status} — ${d.davinci.note}`],
    ['Local AI (Ollama)', d.local_ai.reachable, d.local_ai.reachable ? d.local_ai.models.join(', ') || 'no models' : t(lang, 'notDetected')],
  ]
  const shown = only === 'davinci' ? rows.filter(r => r[0] === 'DaVinci Resolve') : only === 'local_ai' ? rows.filter(r => r[0].startsWith('Local')) : rows
  return (
    <div className="space-y-3">
      {shown.map(([n, ok, v]) => <Card key={n}><div className="flex items-center justify-between"><b>{n}</b><Badge ok={ok}>{ok ? 'OK' : '✕'}</Badge></div><div className="mt-1 text-sm opacity-80" dir="ltr">{v}</div></Card>)}
      {!only && <Card title={t(lang, 'storage')}><div dir="ltr">{d.storage.data_dir} — {d.storage.free_gb}/{d.storage.total_gb} GB</div></Card>}
      <button className="btn-ghost" onClick={load}>{t(lang, 'refresh')}</button>
    </div>
  )
}
