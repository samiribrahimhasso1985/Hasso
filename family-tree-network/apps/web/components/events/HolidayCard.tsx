'use client';

import type { HolidayToday } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import EventCover from './EventCover';
import { dateText, nameIn } from './format';

/**
 * A day of the ÊZÎDÎ Calendar. "featured" = today (celebratory, large); "standard" = tomorrow; "compact" = calendar list.
 * Shows the original Kurmanji name with the name in the reader's language.
 */
export default function HolidayCard({ h, size, onOpen }: { h: Pick<HolidayToday, 'day' | 'date'> & { phase?: HolidayToday['phase'] }; size: 'featured' | 'standard' | 'compact'; onOpen?: () => void }) {
  const { tx, locale } = useEv();
  const local = nameIn(h.day.names, locale);
  const summary = h.day.summary ? (h.day.summary as Record<string, string | undefined>)[locale] : null;
  const range = h.date.startDate === h.date.endDate ? dateText(h.date.startDate, locale) : `${dateText(h.date.startDate, locale, false)} – ${dateText(h.date.endDate, locale, false)}`;
  return (
    <article className={`ev-holiday ${size} t-${h.day.template.toLowerCase()}`} data-testid={`ev-holiday-${h.day.slug}`}>
      {size !== 'compact' && <EventCover template={h.day.template} seed={h.day.slug} />}
      <div className="ev-holiday-body">
        <p className="ev-kicker">
          {h.phase && <span className={`ev-phase ${h.phase.toLowerCase()}`}>{h.phase === 'TODAY' ? tx(EV.today) : tx(EV.tomorrow)}</span>}
          <span>{tx(EV[`h_${h.day.category}` as keyof typeof EV] as Record<string, string>)}</span>
        </p>
        <h3 lang="ku">{h.day.names.ku}</h3>
        {locale !== 'ku' && local !== h.day.names.ku && <p className="ev-local-name">{local}</p>}
        <p className="ev-when">{range}{h.date.traditionalDate ? ` · ${h.date.traditionalDate}` : ''}</p>
        {summary && size !== 'compact' && <p className="ev-summary">{summary}</p>}
        {h.date.verification !== 'VERIFIED' && <p className="ev-unverified">{h.date.verification === 'DISPUTED' ? tx(EV.disputed) : tx(EV.unverified)}</p>}
        {onOpen && <button type="button" className="ev-btn primary" onClick={onOpen}>{tx(EV.discoverDay)}</button>}
      </div>
    </article>
  );
}
