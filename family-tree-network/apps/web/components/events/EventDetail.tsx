'use client';

import { useEffect, useState } from 'react';
import { ApiError, photoSrc, type Api, type EventDetailData, type PersonSummary } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import { avatarFor } from '../GraphCanvas';
import Countdown from './Countdown';
import EventCover from './EventCover';
import EventSchedule from './EventSchedule';
import { nameIn, placeText, shareLink, whenText } from './format';

/**
 * Event page: hero, date, countdown, description, program, speakers, place (private venues only for participants),
 * organizer, registration, FAQ, share and save. `api` = null for the public page (no account).
 */
export default function EventDetail({
  api,
  data,
  onBack,
  onChanged,
  onEdit,
  onDeleted,
  signInHref,
}: {
  api: Api | null;
  data: EventDetailData;
  onBack?: () => void;
  onChanged?: (d: EventDetailData) => void;
  onEdit?: () => void;
  onDeleted?: () => void;
  signInHref?: string;
}) {
  const { tx, locale } = useEv();
  const [e, setE] = useState(data);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [attendees, setAttendees] = useState<(PersonSummary & { registeredAt: string })[] | null>(null);
  useEffect(() => setE(data), [data]);
  useEffect(() => {
    if (api && e.canEdit && e.registration === 'RSVP') api.eventAttendees(e.id).then(setAttendees).catch(() => undefined);
  }, [api, e.id, e.canEdit, e.registration, e.attendees]);

  const run = async (fn: () => Promise<EventDetailData | unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      if (r && typeof r === 'object' && 'id' in (r as object)) {
        setE(r as EventDetailData);
        onChanged?.(r as EventDetailData);
      }
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : tx(EV.error));
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const r = await shareLink(`${window.location.origin}/e/${e.id}`, e.title);
    if (r === 'copied') setMsg(tx(EV.copied));
  };
  const place = placeText(e.city, e.country, locale);
  const ended = new Date(e.endsAt) < new Date();

  return (
    <article className={`ev-detail t-${e.template.toLowerCase()}`} data-testid="ev-detail">
      <header className="ev-hero">
        <EventCover template={e.template} seed={e.id} className="ev-hero-art" />
        <div className="ev-hero-text">
          {onBack && <button type="button" className="ev-btn ghost" onClick={onBack} data-testid="ev-back">‹ {tx(EV.back)}</button>}
          <p className="ev-kicker">
            <span>{tx(EV[`c_${e.category}` as keyof typeof EV] as Record<string, string>)}</span>
            {e.status !== 'PUBLISHED' && <span className="ev-chip ev-status">{tx(EV[`st_${e.status}` as keyof typeof EV] as Record<string, string>)}</span>}
          </p>
          <h1>{e.title}</h1>
          <p className="ev-when big">{whenText(e.startsAt, e.endsAt, e.timeZone, locale)} <small>({e.timeZone})</small></p>
          {(place || e.online) && <p className="ev-where">⌖ {[place, e.online ? tx(EV.online) : null].filter(Boolean).join(' · ')}</p>}
          <Countdown startsAt={e.startsAt} endsAt={e.endsAt} cancelled={e.status === 'CANCELLED'} />
          <div className="ev-actions">
            {api && e.registration === 'RSVP' && e.status === 'PUBLISHED' && !ended && !e.isOrganizer && (
              e.registered ? (
                <button type="button" className="ev-btn" disabled={busy} onClick={() => run(() => api.registerEvent(e.id, false))} data-testid="ev-unregister">✓ {tx(EV.registered)} · {tx(EV.unregister)}</button>
              ) : (
                <button type="button" className="ev-btn primary" disabled={busy || e.spotsLeft === 0} onClick={() => run(() => api.registerEvent(e.id, true))} data-testid="ev-register">
                  {e.spotsLeft === 0 ? tx(EV.full) : tx(EV.register)}
                </button>
              )
            )}
            {!api && e.registration === 'RSVP' && signInHref && <a className="ev-btn primary" href={signInHref}>{tx(EV.register)}</a>}
            {e.registration === 'EXTERNAL' && e.registrationUrl && <a className="ev-btn primary" href={e.registrationUrl} target="_blank" rel="noopener noreferrer">{tx(EV.externalReg)} ↗</a>}
            {e.audience === 'PUBLIC' && e.status === 'PUBLISHED' && <button type="button" className="ev-btn" onClick={share} data-testid="ev-share">{tx(EV.share)}</button>}
            {api && (
              <button type="button" className={`ev-btn ${e.saved ? 'on' : ''}`} aria-pressed={e.saved} onClick={() => run(async () => { const r = await api.saveEvent(e.id, !e.saved); return { ...e, saved: r.saved }; })} data-testid="ev-save">
                {e.saved ? `★ ${tx(EV.saved)}` : `☆ ${tx(EV.save)}`}
              </button>
            )}
            {e.spotsLeft !== null && e.spotsLeft > 0 && <span className="ev-reg">{tx(EV.spots(e.spotsLeft))}</span>}
          </div>
          {msg && <p className="ev-msg" role="status">{msg}</p>}
        </div>
      </header>

      <div className="ev-columns">
        <div className="ev-main">
          {e.reviewNote && <p className="ev-note"><b>{tx(EV.reviewNote)}:</b> {e.reviewNote}</p>}
          {e.description && <section className="ev-section"><p className="ev-description">{e.description}</p></section>}
          {e.sessions.length > 0 && (
            <section className="ev-section">
              <h2>{tx(EV.program)}</h2>
              <EventSchedule sessions={e.sessions} timeZone={e.timeZone} />
            </section>
          )}
          {e.speakers.length > 0 && (
            <section className="ev-section">
              <h2>{tx(EV.speakers)}</h2>
              <ul className="ev-speakers">
                {e.speakers.map((s, i) => <li key={i}><span className="ev-initial">{s.name.slice(0, 1)}</span><span><strong>{s.name}</strong>{s.role && <small>{s.role}</small>}</span></li>)}
              </ul>
            </section>
          )}
          {e.faq.length > 0 && (
            <section className="ev-section">
              <h2>{tx(EV.faq)}</h2>
              {e.faq.map((f, i) => <details key={i} className="ev-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
            </section>
          )}
        </div>
        <aside className="ev-side">
          <section className="ev-panel">
            <h3>{tx(EV.location)}</h3>
            {e.venue && <p>{e.venue}</p>}
            {place && <p className="ev-muted">{place}</p>}
            {e.venueHidden && <p className="ev-muted">{tx(EV.venueHidden)}</p>}
            {e.onlineUrl && <a className="ev-btn" href={e.onlineUrl} target="_blank" rel="noopener noreferrer">{tx(EV.joinOnline)} ↗</a>}
          </section>
          <section className="ev-panel">
            <h3>{tx(EV.organizer)}</h3>
            <p className="ev-org">
              <img src={photoSrc(e.organizer.avatarUrl) ?? avatarFor(e.organizer.displayName, false)} alt="" width={36} height={36} />
              <span>{e.hostName && <strong>{e.hostName}</strong>}<span>{e.organizer.displayName}</span></span>
            </p>
            {e.contact && <p className="ev-muted">{tx(EV.contact)}: <span className="ev-select">{e.contact}</span></p>}
          </section>
          {e.calendarDay && (
            <section className="ev-panel">
              <h3>{tx(EV.celebrates)}</h3>
              <p lang="ku"><strong>{e.calendarDay.names.ku}</strong></p>
              <p className="ev-muted">{nameIn(e.calendarDay.names, locale)}</p>
            </section>
          )}
          {e.canEdit && api && (
            <section className="ev-panel" data-testid="ev-organizer-panel">
              <h3>{tx(EV.participants)} · {e.attendees}</h3>
              {attendees && (attendees.length ? (
                <ul className="ev-attendees">{attendees.map((a) => <li key={a.id}>{a.displayName}</li>)}</ul>
              ) : <p className="ev-muted">{tx(EV.noParticipants)}</p>)}
              <div className="ev-actions">
                {onEdit && <button type="button" className="ev-btn" onClick={onEdit} data-testid="ev-edit">{tx(EV.edit)}</button>}
                {e.status === 'PUBLISHED' && <button type="button" className="ev-btn" disabled={busy} onClick={() => run(() => api.cancelEvent(e.id))} data-testid="ev-cancel">{tx(EV.cancelEvent)}</button>}
                {!confirmDel ? (
                  <button type="button" className="ev-btn danger" onClick={() => setConfirmDel(true)} data-testid="ev-delete">{tx(EV.deleteEvent)}</button>
                ) : (
                  <span className="ev-confirm">
                    {tx(EV.confirmDelete)}
                    <button type="button" className="ev-btn danger" onClick={async () => { await api.deleteEvent(e.id).catch(() => undefined); onDeleted?.(); }} data-testid="ev-delete-yes">{tx(EV.yes)}</button>
                    <button type="button" className="ev-btn" onClick={() => setConfirmDel(false)}>{tx(EV.no)}</button>
                  </span>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
