'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_NAMES, PLACES, type WorldLocale, type WorldPlace } from '../../lib/world/places';
import { WT } from '../../lib/world/texts';
import { hasWebGL, WorldScene } from './WorldScene';

const LANGS: { code: WorldLocale; label: string }[] = [
  { code: 'ku', label: 'Kurmancî' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

/** EZIDINET WORLD — From Sinjar to the World (independent module, page /world). */
export default function WorldExperience() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<WorldScene | null>(null);
  const [lang, setLang] = useState<WorldLocale>('ar');
  const [place, setPlace] = useState<WorldPlace | null>(null);
  const [panel, setPanel] = useState<'communities' | 'heritage' | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [ready, setReady] = useState(false);
  const t = (k: keyof typeof WT) => WT[k][lang];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ezidinet-lang') as WorldLocale | null;
      if (saved && WT.title[saved]) setLang(saved);
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    if (!canvas.current) return;
    if (!hasWebGL()) return setWebgl(false);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowDetail = window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4;
    let s: WorldScene;
    try {
      s = new WorldScene(canvas.current, { lowDetail, reduceMotion, onSelect: setPlace, onReady: () => setReady(true) });
    } catch {
      return setWebgl(false);
    }
    scene.current = s;
    (window as unknown as { __ezWorld?: WorldScene }).__ezWorld = s; // test hook (positions of places)
    // Animate only while visible: stops on other tabs, when scrolled away, and for reduced motion.
    let visible = true;
    const sync = () => (visible && !document.hidden && !reduceMotion ? s.start() : (s.stop(), s.renderOnce()));
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); });
    io.observe(canvas.current);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      s.dispose();
      scene.current = null;
    };
  }, []);

  // Keep the scene on the side opposite the title (RTL title on the right).
  useEffect(() => { scene.current?.setSide(lang === 'ar' ? 'rtl' : 'ltr'); }, [lang, ready]);

  const byCountry = useMemo(() => {
    const m = new Map<string, WorldPlace[]>();
    for (const p of PLACES) m.set(p.country, [...(m.get(p.country) ?? []), p]);
    return [...m.entries()];
  }, []);

  const choose = (id: string) => {
    setPanel(null);
    if (scene.current) scene.current.select(id);
    else setPlace(PLACES.find((p) => p.id === id) ?? null);
  };

  return (
    <div className="world" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      {webgl ? (
        <canvas ref={canvas} className="world-canvas" data-testid="world-canvas" aria-label={t('title')} />
      ) : (
        <div className="world-fallback" data-testid="world-fallback">
          <p>{t('noWebgl')}</p>
          <ul>{PLACES.map((p) => <li key={p.id}><button type="button" onClick={() => choose(p.id)}>{p.name[lang]}</button></li>)}</ul>
        </div>
      )}

      <header className="world-top">
        <a className="world-brand" href="/" aria-label="EZIDINET">EZIDINET</a>
        <div className="world-langs" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>{l.label}</button>
          ))}
        </div>
      </header>

      <section className={`world-hero ${place || panel ? 'dim' : ''}`}>
        <p className="world-kicker">{t('kicker')}</p>
        <h1>{t('title')}</h1>
        <p className="world-tagline">«{t('tagline')}»</p>
        <div className="world-actions">
          <button type="button" className="w-btn primary" data-testid="w-explore" onClick={() => { setPanel(null); scene.current?.flyTo('globe'); }}>{t('explore')}</button>
          <button type="button" className="w-btn" data-testid="w-communities" onClick={() => setPanel(panel === 'communities' ? null : 'communities')}>{t('communities')}</button>
          <button type="button" className="w-btn" data-testid="w-heritage" onClick={() => setPanel(panel === 'heritage' ? null : 'heritage')}>{t('heritage')}</button>
          <a className="w-btn gold" href="/app?mode=register">{t('join')}</a>
        </div>
      </section>

      <nav className="world-views" aria-label="View">
        <button type="button" onClick={() => scene.current?.flyTo('sinjar')} data-testid="w-sinjar">⛰ {t('sinjar')}</button>
        <button type="button" onClick={() => scene.current?.flyTo('overview')}>◎ {t('overview')}</button>
      </nav>
      <p className="world-hint">{t('hint')} · <span>{t('preview')}</span></p>
      {!ready && webgl && <div className="world-loading" aria-hidden="true" />}

      {panel && (
        <aside className="world-panel" data-testid={`w-panel-${panel}`}>
          <div className="w-panel-head">
            <h2>{panel === 'heritage' ? t('places') : t('countries')}</h2>
            <button type="button" className="w-close" onClick={() => setPanel(null)} aria-label={t('close')}>×</button>
          </div>
          {panel === 'heritage' ? (
            <ul className="w-list">
              {PLACES.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => choose(p.id)} data-testid={`w-place-${p.id}`}>
                    <i className={p.kind} /> {p.name[lang]} <small>{COUNTRY_NAMES[p.country]?.[lang]}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="w-list">
                {byCountry.map(([cc, ps]) => (
                  <li key={cc}>
                    <button type="button" onClick={() => choose(ps[0].id)}>
                      <b>EZIDINET {COUNTRY_NAMES[cc]?.en}</b> <small>{COUNTRY_NAMES[cc]?.[lang]}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="w-note">{t('noCommunities')}</p>
            </>
          )}
          <p className="w-note">{t('privacy')}</p>
        </aside>
      )}

      {place && (
        <aside className="world-card" data-testid="w-card" role="dialog" aria-labelledby="w-card-title">
          <div className="w-panel-head">
            <div>
              <span className={`w-kind ${place.kind}`}>{place.kind === 'homeland' ? t('homeland') : t('diaspora')}</span>
              <h2 id="w-card-title">{place.name[lang]}</h2>
              <p className="w-country">{COUNTRY_NAMES[place.country]?.[lang]}</p>
            </div>
            <button type="button" className="w-close" onClick={() => { scene.current?.select(null, false); setPlace(null); }} aria-label={t('close')}>×</button>
          </div>
          <p>{place.note[lang]}</p>
          <h3>{t('story')}</h3>
          <p className="w-note">{t('storySoon')}</p>
          <h3>{t('onEzidinet')} — EZIDINET {COUNTRY_NAMES[place.country]?.en}</h3>
          <p className="w-note">{t('noCommunities')}</p>
          <p className="w-draft">{t('draft')}</p>
        </aside>
      )}
    </div>
  );
}
