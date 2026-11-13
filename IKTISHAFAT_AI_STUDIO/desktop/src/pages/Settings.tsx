import { Lang, t } from '../i18n'
import { Card } from '../components/ui'
import { L } from '../components/widgets'

export const THEMES = [
  { id: 'dark', ar: 'سينمائي داكن', en: 'Cinematic dark', bg: '#04070F', card: '#0A1428', ac: '#E9B44C' },
  { id: 'ivory', ar: 'عاجي دافئ', en: 'Warm ivory', bg: '#FAF6EE', card: '#FFFFFF', ac: '#966208' },
  { id: 'sky', ar: 'أزرق سماوي', en: 'Sky blue', bg: '#EEF4FB', card: '#FFFFFF', ac: '#1458BC' },
  { id: 'sage', ar: 'أخضر هادئ', en: 'Calm sage', bg: '#EEF5F0', card: '#FFFFFF', ac: '#18704A' },
  { id: 'rose', ar: 'وردي رملي', en: 'Sand rose', bg: '#FCF2F1', card: '#FFFFFF', ac: '#B03050' },
]

export default function Settings({ lang, setLang, theme, setTheme }: { lang: Lang; setLang: (l: Lang) => void; theme: string; setTheme: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <Card title={t(lang, 'language')}><div className="flex gap-2">{(['ar', 'de', 'en'] as Lang[]).map(l => <button key={l} className={l === lang ? 'btn' : 'btn-ghost'} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div></Card>
      <Card title={L(lang, 'ألوان الواجهة', 'Interface theme')}>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="theme">
          {THEMES.map(th => (
            <button key={th.id} role="radio" aria-checked={theme === th.id} onClick={() => setTheme(th.id)} className={`w-36 rounded-xl border-2 p-2 text-start text-sm ${theme === th.id ? 'border-gold' : 'border-warm/20'}`}>
              <div className="mb-2 h-14 rounded-lg p-1.5" style={{ background: th.bg }}><div className="h-full rounded" style={{ background: th.card, borderTop: `4px solid ${th.ac}` }} /></div>
              {L(lang, th.ar, th.en)}</button>))}
        </div>
      </Card>
    </div>)
}
