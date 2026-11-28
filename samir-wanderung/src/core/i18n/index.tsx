import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TKey } from './en';
import { de } from './de';
import { ar } from './ar';
import { ku } from './ku';

export type Lang = 'en' | 'de' | 'ar' | 'ku';

export const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ku', label: 'Kurdî (Kurmancî)', dir: 'ltr' },
];

const DICTS: Record<Lang, Partial<Record<TKey, string>>> = { en, de, ar, ku };

export function translate(lang: Lang, key: TKey): string {
  return DICTS[lang][key] ?? en[key] ?? key;
}

export function dirOf(lang: Lang): 'ltr' | 'rtl' {
  return LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';
}

/** Locale used for number/date formatting. */
export function localeOf(lang: Lang): string {
  return { en: 'en-GB', de: 'de-DE', ar: 'ar', ku: 'ku' }[lang];
}

interface I18nCtx {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
  fmt: (n: number, digits?: number) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('sw.lang') as Lang | null;
    if (saved && saved in DICTS) return saved;
  } catch { /* storage unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2);
  return (['de', 'ar', 'ku'].includes(nav) ? nav : 'en') as Lang;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = dirOf(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('sw.lang', l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<I18nCtx>(() => {
    // Western digits are used for all languages so coordinates and numbers stay unambiguous.
    const nf = new Intl.NumberFormat(localeOf(lang) + '-u-nu-latn', { maximumFractionDigits: 1 });
    return {
      lang, dir, setLang,
      t: (k) => translate(lang, k),
      fmt: (n, digits) => digits === undefined ? nf.format(n)
        : new Intl.NumberFormat(localeOf(lang) + '-u-nu-latn', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n),
    };
  }, [lang, dir, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n outside I18nProvider');
  return c;
}

export type { TKey };
