import { Lang, t } from '../i18n'
import { Card } from '../components/ui'
export default function Settings({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return <Card title={t(lang, 'language')}><div className="flex gap-2">{(['ar', 'de', 'en'] as Lang[]).map(l => <button key={l} className={l === lang ? 'btn' : 'btn-ghost'} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div></Card>
}
