import { useEffect, useState } from 'react'
import { Lang, isRtl, t } from './i18n'
import { NAV } from './modules/nav'
import { api } from './services/api'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Media from './pages/Media'
import Diagnostics from './pages/Diagnostics'
import Settings from './pages/Settings'
import Placeholder from './pages/Placeholder'
import { Badge } from './components/ui'

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'ar')
  const [page, setPage] = useState('dashboard'); const [ok, setOk] = useState(false); const [tick, setTick] = useState(0)
  const setLang = (l: Lang) => { localStorage.setItem('lang', l); setLangState(l) }
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr' }, [lang])
  useEffect(() => { const ping = () => api.health().then(() => setOk(true)).catch(() => setOk(false)); ping(); const i = setInterval(ping, 5000); return () => clearInterval(i) }, [])
  const nav = NAV.find(n => n.id === page)!
  const body = () => {
    switch (page) {
      case 'dashboard': return <Dashboard key={tick} lang={lang} />
      case 'projects': return <Projects lang={lang} onChange={() => setTick(x => x + 1)} />
      case 'media': return <Media lang={lang} />
      case 'diagnostics': return <Diagnostics lang={lang} />
      case 'settings': return <Settings lang={lang} setLang={setLang} />
      case 'davinci': return <><Diagnostics lang={lang} only="davinci" /><div className="mt-3"><Placeholder lang={lang} id="davinci" phase={5} /></div></>
      case 'aiModels': return <><Diagnostics lang={lang} only="local_ai" /><div className="mt-3"><Placeholder lang={lang} id="aiModels" phase={3} /></div></>
      default: return <Placeholder lang={lang} id={page} phase={nav.phase} />
    }
  }
  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 overflow-y-auto border-gold/20 bg-navy p-3 ltr:border-r rtl:border-l">
        <div className="mb-4"><div className="font-serif text-xl font-bold text-gold">IKTISHAFAT</div><div className="text-xs tracking-widest opacity-70">AI STUDIO</div></div>
        <nav className="space-y-1">{NAV.map(n => <button key={n.id} onClick={() => setPage(n.id)} className={`block w-full rounded-lg px-3 py-2 text-start text-sm ${page === n.id ? 'bg-gold text-ink font-semibold' : 'hover:bg-gold/10'}`}>{t(lang, n.id)}{n.phase ? <span className="opacity-40"> ·{n.phase}</span> : null}</button>)}</nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gold/20 px-6 py-3"><h1 className="text-xl font-bold">{t(lang, page)}</h1><div className="flex items-center gap-3 text-xs"><span className="opacity-60">{t(lang, 'tagline')}</span><Badge ok={ok}>{ok ? t(lang, 'connected') : t(lang, 'disconnected')}</Badge></div></header>
        <div className="flex-1 overflow-y-auto p-6">{body()}</div>
      </main>
    </div>
  )
}
