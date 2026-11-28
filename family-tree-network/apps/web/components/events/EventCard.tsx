'use client';

import type { EventCardData } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import EventCover from './EventCover';
import { placeText, whenText } from './format';

/** Premium card for a community event — generated automatically from what the organizer entered. */
export default function EventCard({ e, onOpen, onSave, onShare, featured = false }: { e: EventCardData; onOpen: () => void; onSave?: () => void; onShare?: () => void; featured?: boolean }) {
  const { tx, locale } = useEv();
  const place = e.online && !e.city ? tx(EV.online) : placeText(e.city, e.country, locale);
  const regState = e.registration === 'RSVP' ? (e.registered ? tx(EV.registered) : e.spotsLeft === 0 ? tx(EV.full) : e.spotsLeft !== null ? tx(EV.spots(e.spotsLeft)) : tx(EV.register)) : null;
  return (
    <article className={`ev-card t-${e.template.toLowerCase()} ${featured ? 'featured' : ''}`} data-testid={`ev-card-${e.id}`}>
      <button type="button" className="ev-card-media" onClick={onOpen} aria-label={e.title}>
        <EventCover template={e.template} seed={e.id} />
        <span className="ev-chip">{tx(EV[`c_${e.category}` as keyof typeof EV] as Record<string, string>)}</span>
        {e.status !== 'PUBLISHED' && <span className="ev-chip ev-status">{tx(EV[`st_${e.status}` as keyof typeof EV] as Record<string, string>)}</span>}
      </button>
      <div className="ev-card-body">
        <p className="ev-when">{whenText(e.startsAt, e.endsAt, e.timeZone, locale)}</p>
        <h3><button type="button" onClick={onOpen}>{e.title}</button></h3>
        {e.summary && <p className="ev-summary">{e.summary}</p>}
        <p className="ev-meta">
          {place && <span>⌖ {place}</span>}
          <span>{tx(EV.organizer)}: {e.hostName || e.organizer.displayName}</span>
        </p>
        <div className="ev-actions">
          <button type="button" className="ev-btn primary" onClick={onOpen} data-testid={`ev-open-${e.id}`}>{tx(EV.details)}</button>
          {onShare && e.audience === 'PUBLIC' && e.status === 'PUBLISHED' && <button type="button" className="ev-btn" onClick={onShare}>{tx(EV.share)}</button>}
          {onSave && (
            <button type="button" className={`ev-btn ${e.saved ? 'on' : ''}`} aria-pressed={e.saved} onClick={onSave} data-testid={`ev-save-${e.id}`}>
              {e.saved ? `★ ${tx(EV.saved)}` : `☆ ${tx(EV.save)}`}
            </button>
          )}
          {regState && <span className="ev-reg">{regState}</span>}
        </div>
      </div>
    </article>
  );
}
