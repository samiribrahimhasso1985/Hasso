import { useState } from 'react'
import { api } from '../services/api'
import { AI } from '../services/useAI'
import { Lang } from '../i18n'
import { Card, ErrorBox } from '../components/ui'
import { L } from '../components/widgets'

export default function AIModels({ lang, ai }: { lang: Lang; ai: AI }) {
  const [keys, setKeys] = useState<Record<string, string>>({}); const [err, setErr] = useState(''); const [note, setNote] = useState('')
  const save = async (p: string) => { setErr(''); try { await api.aiSetKey(p, keys[p]); setKeys({ ...keys, [p]: '' }); setNote(`${p}: ${L(lang, 'حُفظ المفتاح في مخزن النظام الآمن', 'key saved to the OS secure store')}`); await ai.refresh() } catch (e: any) { setErr(e.message) } }
  const del = async (p: string) => { await api.aiDelKey(p); await ai.refresh() }
  const test = async (p: string) => { setErr(''); const r = await api.aiTest(p); setNote(r.ok ? `${p}: ${r.models.length} models` : ''); if (!r.ok) setErr(`${p}: ${r.error}`); await ai.refresh() }
  return (
    <div className="space-y-3">
      {err && <ErrorBox msg={err} />}{note && <div className="text-sm text-ok">{note}</div>}
      {!ai.secure && <ErrorBox msg={L(lang, 'لا يوجد مخزن اعتماد آمن في هذا النظام. استخدم متغيرات البيئة ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY.', 'No secure credential store here. Use the ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY environment variables.')} />}
      <p className="text-sm opacity-70">{L(lang, 'المفاتيح تُحفظ في Windows Credential Manager ولا تظهر في الواجهة أو السجلات أو قاعدة البيانات. لا يُرسل أي فيديو إلى السحابة.', 'Keys are stored in Windows Credential Manager and never shown in the UI, logs or database. No video is ever sent to the cloud.')}</p>
      {ai.providers.map(p => (
        <Card key={p.id} title={p.label}>
          {p.id === 'ollama' ? <div className="text-sm">{p.reachable ? `${L(lang, 'متصل', 'Online')} — ${p.models.join(', ') || L(lang, 'لا نماذج مثبتة', 'no models installed')}` : L(lang, 'Ollama غير متصل. ثبّته من ollama.com وشغّله.', 'Ollama is offline. Install it from ollama.com and start it.')}</div> : (
            <div className="flex flex-wrap items-center gap-2">
              <input className="input max-w-sm" type="password" autoComplete="off" aria-label={`${p.id}-key`} placeholder={p.configured ? `••••••••  ${L(lang, '(محفوظ)', '(saved)')}` : L(lang, 'مفتاح API', 'API key')} value={keys[p.id] ?? ''} onChange={e => setKeys({ ...keys, [p.id]: e.target.value })} />
              <button className="btn" disabled={(keys[p.id] ?? '').length < 8} onClick={() => save(p.id)}>{L(lang, 'حفظ', 'Save')}</button>
              <button className="btn-ghost" disabled={!p.configured} onClick={() => test(p.id)}>Test</button>
              <button className="btn-ghost" disabled={!p.configured} onClick={() => del(p.id)}>{L(lang, 'حذف', 'Remove')}</button>
              <span className="text-xs opacity-70">{p.reachable ? `✔ ${p.models.length} models` : p.configured ? L(lang, 'مفتاح محفوظ — اضغط Test', 'Key saved — press Test') : ''}</span></div>)}
        </Card>))}
    </div>)
}
