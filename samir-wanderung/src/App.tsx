import { lazy, Suspense, useEffect, useState } from 'react';
import { useI18n, LANGS, type Lang, type TKey } from './core/i18n';
import { useStore, type PageId } from './core/store';
import { Spinner } from './ui/components';
import Home from './features/Home';

const pages: Record<PageId, React.LazyExoticComponent<() => JSX.Element> | (() => JSX.Element)> = {
  home: Home,
  world: lazy(() => import('./features/WorldExplorer')),
  planner: lazy(() => import('./features/Planner')),
  cinematic: lazy(() => import('./features/Cinematic')),
  live: lazy(() => import('./features/LiveNavigation')),
  mountain: lazy(() => import('./features/MountainExplorer')),
  journeys: lazy(() => import('./features/Journeys')),
  atlas: lazy(() => import('./features/Atlas')),
  assistant: lazy(() => import('./features/Assistant')),
  community: lazy(() => import('./features/Community')),
  studio: lazy(() => import('./features/Studio')),
  safety: lazy(() => import('./features/Safety')),
  offline: lazy(() => import('./features/Offline')),
  settings: lazy(() => import('./features/Settings')),
};

const NAV: { id: PageId; key: TKey; icon: string; main?: boolean }[] = [
  { id: 'home', key: 'nav.home', icon: '⌂', main: true },
  { id: 'world', key: 'nav.world', icon: '◍', main: true },
  { id: 'planner', key: 'nav.planner', icon: '⇢', main: true },
  { id: 'cinematic', key: 'nav.cinematic', icon: '▶', main: true },
  { id: 'live', key: 'nav.live', icon: '◎', main: true },
  { id: 'mountain', key: 'nav.mountain', icon: '▲' },
  { id: 'journeys', key: 'nav.journeys', icon: '☰' },
  { id: 'atlas', key: 'nav.atlas', icon: '✦' },
  { id: 'assistant', key: 'nav.assistant', icon: '✧' },
  { id: 'community', key: 'nav.community', icon: '☺' },
  { id: 'studio', key: 'nav.studio', icon: '◧' },
  { id: 'safety', key: 'nav.safety', icon: '✚' },
  { id: 'offline', key: 'nav.offline', icon: '⇣' },
  { id: 'settings', key: 'nav.settings', icon: '⚙' },
];

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { page, go, online, settings } = useStore();
  const [menu, setMenu] = useState(false);
  const Page = pages[page];

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [page]);
  useEffect(() => { document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion); }, [settings.reducedMotion]);

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-ink-800">Skip to content</a>
      {/* Sidebar (desktop) / top bar (mobile) */}
      <aside className="md:w-64 md:h-screen md:sticky md:top-0 flex md:flex-col border-b md:border-b-0 md:border-e border-white/5 bg-ink-950/80 backdrop-blur-xl z-40">
        <div className="flex items-center justify-between w-full md:block p-3 md:p-5">
          <button className="text-start" onClick={() => go('home')} aria-label="SSBN">
            <div className="font-display text-lg md:text-xl font-bold tracking-[0.18em] text-white">SS<span className="text-aqua-400">BN</span></div>
            <div className="hidden md:block text-[9px] tracking-[0.2em] text-slate-500 mt-1">{t('brand.tagline')}</div>
          </button>
          <button className="md:hidden btn btn-chip" aria-expanded={menu} aria-controls="nav" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
        </div>
        <nav id="nav" aria-label="Main" className={`${menu ? 'block' : 'hidden'} md:block absolute md:static top-full inset-x-0 bg-ink-950 md:bg-transparent border-b md:border-0 border-white/10 md:flex-1 overflow-y-auto scrollbar-thin`}>
          <ul className="p-2 md:px-3 grid grid-cols-2 md:grid-cols-1 gap-0.5">
            {NAV.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n.id)} aria-current={page === n.id ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${page === n.id ? 'bg-aqua-500/10 text-aqua-300 border border-aqua-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent'} ${n.main ? '' : 'md:text-[13px]'}`}>
                  <span className="w-4 text-center opacity-80" aria-hidden>{n.icon}</span>{t(n.key)}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-3 md:p-4">
            <label className="field-label" htmlFor="lang">{t('settings.language')}</label>
            <select id="lang" className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)} data-testid="lang-select">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            {!online && <div className="mt-3 text-xs text-amber-300" role="status">● {t('safety.offlineState')}</div>}
          </div>
        </nav>
      </aside>
      <main id="main" className="flex-1 min-w-0">
        <Suspense fallback={<div className="page"><Spinner label={t('common.loading')} /></div>}>
          <div key={page} className="fade-in"><Page /></div>
        </Suspense>
      </main>
    </div>
  );
}
