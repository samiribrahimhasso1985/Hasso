'use client';

import { LOCALES, useI18n } from '../lib/i18n';

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t.language}>
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === locale ? 'active' : ''}
          aria-pressed={l.code === locale}
          onClick={() => setLocale(l.code)}
          data-testid={`lang-${l.code}`}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
