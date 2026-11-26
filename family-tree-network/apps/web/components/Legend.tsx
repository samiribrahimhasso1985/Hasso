'use client';

import type { Category } from '../lib/api';
import { useI18n } from '../lib/i18n';

export const CATEGORY_COLORS: Record<Category, string> = {
  FAMILY: '#25A9FF',
  UNION: '#FF4D91',
  FRIENDSHIP: '#E8B94F',
  PROFESSIONAL: '#A56BFF',
  SOCIAL: '#43D99A',
  CUSTOM: '#AAB7CA',
};

/** Colour + text + line pattern: never colour alone (accessibility). */
export default function Legend() {
  const { t } = useI18n();
  const cats: Category[] = ['FAMILY', 'UNION', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL'];
  return (
    <div className="legend" aria-label={t.legend}>
      <h4>{t.legend}</h4>
      <ul>
        {cats.map((c) => (
          <li key={c}>
            <span className="swatch" style={{ background: CATEGORY_COLORS[c], boxShadow: `0 0 8px ${CATEGORY_COLORS[c]}` }} />
            {t[c]}
          </li>
        ))}
        <li>
          <span className="swatch dashed" />
          {t.PENDING}
        </li>
        <li>
          <span className="swatch dotted" />
          {t.DISPUTED}
        </li>
      </ul>
    </div>
  );
}
