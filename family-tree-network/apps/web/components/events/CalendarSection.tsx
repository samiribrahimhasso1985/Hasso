'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Api, CalendarDayData } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import EventCover from './EventCover';
import HolidayCard from './HolidayCard';
import { dateText } from './format';

/** The ÊZÎDÎ Calendar of a year (verified dates only) and the page of a single day. */
export default function CalendarSection({ api, onOpenEvent }: { api: Api; onOpenEvent: (id: string) => void }) {
  const { tx } = useEv();
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<CalendarDayData[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { setDays(null); api.calendarYear(year).then((r) => setDays(r.days.filter((d) => d.published && d.dates.some((x) => x.verification === 'VERIFIED')))).catch(() => setDays([])); }, [api, year]);
  if (open) return <DayPage api={api} slug={open} onBack={() => setOpen(null)} onOpenEvent={onOpenEvent} />;
  return (
    <section className="ev-calendar" data-testid="ev-calendar">
      <div className="ev-year">
        <button type="button" className="ev-btn ghost" onClick={() => setYear(year - 1)} aria-label={String(year - 1)}>‹</button>
        <h2>{tx(EV.calendar)} · {year}</h2>
        <button type="button" className="ev-btn ghost" onClick={() => setYear(year + 1)} aria-label={String(year + 1)}>›</button>
      </div>
      {days === null && <p className="ev-muted">…</p>}
      {days?.length === 0 && <p className="ev-empty">{tx(EV.noCalendar)}</p>}
      <div className="ev-compact-list">
        {days?.flatMap((d) => d.dates.filter((x) => x.verification === 'VERIFIED').map((dt) => (
          <HolidayCard key={dt.id} h={{ day: d, date: dt }} size="compact" onOpen={() => setOpen(d.slug)} />
        )))}
      </div>
    </section>
  );
}

function DayPage({ api, slug, onBack, onOpenEvent }: { api: Api; slug: string; onBack: () => void; onOpenEvent: (id: string) => void }) {
  const { tx, locale } = useEv();
  const [d, setD] = useState<Awaited<ReturnType<Api['calendarDay']>> | null>(null);
  const load = useCallback(() => api.calendarDay(slug).then(setD).catch(() => setD(null)), [api, slug]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="ev-muted">…</p>;
  const text = (o: Record<string, string | undefined> | null) => (o ? o[locale] ?? o.en ?? null : null);
  return (
    <article className={`ev-detail t-${d.template.toLowerCase()}`} data-testid="ev-day">
      <header className="ev-hero">
        <EventCover template={d.template} seed={d.slug} className="ev-hero-art" />
        <div className="ev-hero-text">
          <button type="button" className="ev-btn ghost" onClick={onBack}>‹ {tx(EV.back)}</button>
          <p className="ev-kicker"><span>{tx(EV[`h_${d.category}` as keyof typeof EV] as Record<string, string>)}</span></p>
          <h1 lang="ku">{d.names.ku}</h1>
          <p className="ev-local-name">{[d.names.ar, d.names.de, d.names.en].filter((n) => n !== d.names.ku).join(' · ')}</p>
          {d.dates.map((x) => <p key={x.id} className="ev-when big">{x.startDate === x.endDate ? dateText(x.startDate, locale) : `${dateText(x.startDate, locale, false)} – ${dateText(x.endDate, locale, false)}`}{x.traditionalDate ? ` · ${x.traditionalDate}` : ''}</p>)}
        </div>
      </header>
      <div className="ev-columns">
        <div className="ev-main">
          {text(d.description as Record<string, string | undefined> | null) && <section className="ev-section"><p className="ev-description">{text(d.description as Record<string, string | undefined>)}</p></section>}
          {(d.region || d.tradition) && <section className="ev-section"><p>{[d.region, d.tradition].filter(Boolean).join(' · ')}</p></section>}
          {d.sources.length > 0 && <section className="ev-section"><h2>{tx(EV.sources)}</h2><ul>{d.sources.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
          {d.events.length > 0 && (
            <section className="ev-section">
              <h2>{tx(EV.eventsForDay)}</h2>
              <ul className="ev-linked">{d.events.map((e) => <li key={e.id}><button type="button" onClick={() => onOpenEvent(e.id)}>{e.title}</button></li>)}</ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
