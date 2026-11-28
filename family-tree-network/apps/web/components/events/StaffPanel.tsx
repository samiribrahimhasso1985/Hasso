'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Api, CalendarDayData, EventCardData } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import { dateText, nameIn } from './format';

/**
 * Staff tools (calendar editors & reviewers, set by the owner on the server): review queue, featured events,
 * calendar days — publish texts, add dates, confirm them. Every action is recorded in the audit log by the server.
 */
export default function StaffPanel({ api, onOpenEvent }: { api: Api; onOpenEvent: (id: string) => void }) {
  const { tx, locale } = useEv();
  const [queue, setQueue] = useState<EventCardData[] | null>(null);
  const [days, setDays] = useState<CalendarDayData[] | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [draft, setDraft] = useState<Record<string, { start: string; end: string }>>({});
  const load = useCallback(() => {
    api.events({ scope: 'review' }).then((r) => setQueue(r.items)).catch(() => setQueue([]));
    api.calendarYear(year).then((r) => setDays(r.days)).catch(() => setDays([]));
  }, [api, year]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn: () => Promise<unknown>) => { await fn().catch(() => undefined); load(); };

  return (
    <section className="ev-staff" data-testid="ev-staff">
      <h2>{tx(EV.reviewQueue)}</h2>
      {queue?.length === 0 && <p className="ev-muted">{tx(EV.emptyQueue)}</p>}
      <ul className="ev-staff-list">
        {queue?.map((e) => (
          <li key={e.id}>
            <button type="button" className="ev-link" onClick={() => onOpenEvent(e.id)}>{e.title}</button>
            <span className="ev-muted"> · {tx(EV[`c_${e.category}` as keyof typeof EV] as Record<string, string>)} · {e.organizer.displayName}</span>
            <span className="ev-actions">
              <button type="button" className="ev-btn primary" onClick={() => act(() => api.reviewEvent(e.id, true))} data-testid={`ev-approve-${e.id}`}>{tx(EV.approve)}</button>
              <button type="button" className="ev-btn" onClick={() => act(() => api.reviewEvent(e.id, false))}>{tx(EV.reject)}</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="ev-year">
        <button type="button" className="ev-btn ghost" onClick={() => setYear(year - 1)}>‹</button>
        <h2>{tx(EV.calendarDays)} · {year}</h2>
        <button type="button" className="ev-btn ghost" onClick={() => setYear(year + 1)}>›</button>
      </div>
      <p className="ev-muted">{tx(EV.staffNote)}</p>
      <ul className="ev-staff-days">
        {days?.map((d) => (
          <li key={d.id} data-testid={`ev-staff-day-${d.slug}`}>
            <div className="ev-staff-day-head">
              <strong lang="ku">{d.names.ku}</strong> <span className="ev-muted">{nameIn(d.names, locale)}</span>
              {!d.published && <span className="ev-chip ev-status">{tx(EV.draftDay)}</span>}
              <button type="button" className="ev-btn" onClick={() => act(() => api.updateCalendarDay(d.id, { published: !d.published }))} data-testid={`ev-publish-day-${d.slug}`}>
                {d.published ? tx(EV.unpublishDay) : tx(EV.publishDay)}
              </button>
            </div>
            <ul>
              {d.dates.map((x) => (
                <li key={x.id}>
                  {x.startDate === x.endDate ? dateText(x.startDate, locale) : `${dateText(x.startDate, locale, false)} – ${dateText(x.endDate, locale, false)}`}
                  {' · '}
                  <span className={`ev-ver ${x.verification.toLowerCase()}`}>{x.verification === 'VERIFIED' ? tx(EV.verified) : x.verification === 'DISPUTED' ? tx(EV.disputed) : tx(EV.unverified)}</span>
                  {x.verification !== 'VERIFIED' && <button type="button" className="ev-btn primary" onClick={() => act(() => api.verifyCalendarDate(x.id, 'VERIFIED'))} data-testid={`ev-verify-${x.id}`}>{tx(EV.verify)}</button>}
                  <button type="button" className="ev-btn ghost" onClick={() => act(() => api.deleteCalendarDate(x.id))}>{tx(EV.remove)}</button>
                </li>
              ))}
            </ul>
            <form className="ev-add-date" onSubmit={(ev) => {
              ev.preventDefault();
              const v = draft[d.id];
              if (!v?.start) return;
              act(() => api.addCalendarDate(d.id, { startDate: v.start, endDate: v.end || v.start }));
              setDraft({ ...draft, [d.id]: { start: '', end: '' } });
            }}>
              <label>{tx(EV.firstDay)} <input type="date" value={draft[d.id]?.start ?? ''} onChange={(e) => setDraft({ ...draft, [d.id]: { start: e.target.value, end: draft[d.id]?.end ?? '' } })} data-testid={`ev-date-start-${d.slug}`} /></label>
              <label>{tx(EV.lastDay)} <input type="date" value={draft[d.id]?.end ?? ''} onChange={(e) => setDraft({ ...draft, [d.id]: { start: draft[d.id]?.start ?? '', end: e.target.value } })} /></label>
              <button type="submit" className="ev-btn" data-testid={`ev-add-date-${d.slug}`}>+ {tx(EV.addDate)}</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
