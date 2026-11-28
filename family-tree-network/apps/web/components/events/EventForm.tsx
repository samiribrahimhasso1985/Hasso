'use client';

import { useEffect, useState } from 'react';
import { ApiError, type Api, type CalendarDayData, type EventCategory, type EventDetailData, type EventInput, type EventSessionData, type EventTemplate } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import EventCover from './EventCover';
import { nameIn } from './format';

const CATS: EventCategory[] = ['CULTURAL_FESTIVAL', 'RELIGIOUS_CELEBRATION', 'COMMUNITY_GATHERING', 'HERITAGE_EXHIBITION', 'MUSIC', 'EDUCATIONAL', 'YOUTH', 'CHARITY', 'MEMORIAL', 'ONLINE', 'INTERNATIONAL_MEETUP'];
const TEMPLATES: EventTemplate[] = ['RELIGIOUS', 'CULTURAL', 'HERITAGE', 'COMMUNITY', 'MEMORIAL', 'MUSIC', 'INTERNATIONAL', 'ONLINE', 'LOCAL'];
const SUGGESTED: Record<EventCategory, EventTemplate> = {
  CULTURAL_FESTIVAL: 'CULTURAL', RELIGIOUS_CELEBRATION: 'RELIGIOUS', COMMUNITY_GATHERING: 'COMMUNITY', HERITAGE_EXHIBITION: 'HERITAGE', MUSIC: 'MUSIC',
  EDUCATIONAL: 'COMMUNITY', YOUTH: 'COMMUNITY', CHARITY: 'COMMUNITY', MEMORIAL: 'MEMORIAL', ONLINE: 'ONLINE', INTERNATIONAL_MEETUP: 'INTERNATIONAL',
};

/** "YYYY-MM-DDTHH:mm" in `tz` for an instant, and back. */
function toLocalInput(iso: string, tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}
function fromLocalInput(v: string, tz: string) {
  // Interpret the wall-clock time in `tz`: start from UTC, then correct by the zone's offset at that moment.
  const guess = new Date(`${v}:00Z`);
  const shown = new Date(toLocalInput(guess.toISOString(), tz) + ':00Z');
  return new Date(guess.getTime() - (shown.getTime() - guess.getTime())).toISOString();
}

/** One form for every event; the card and page are generated from it. */
export default function EventForm({ api, initial, onDone, onCancel }: { api: Api; initial?: EventDetailData; onDone: (e: EventDetailData) => void; onCancel: () => void }) {
  const { tx, locale } = useEv();
  const zone = initial?.timeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const nextWeek = new Date(Date.now() + 7 * 864e5);
  nextWeek.setMinutes(0, 0, 0);
  const [f, setF] = useState({
    title: initial?.title ?? '',
    summary: initial?.summary ?? '',
    description: initial?.description ?? '',
    category: (initial?.category ?? 'CULTURAL_FESTIVAL') as EventCategory,
    template: (initial?.template ?? '') as EventTemplate | '',
    audience: initial?.audience ?? 'PUBLIC',
    startsAt: toLocalInput(initial?.startsAt ?? nextWeek.toISOString(), zone),
    endsAt: toLocalInput(initial?.endsAt ?? new Date(nextWeek.getTime() + 3 * 36e5).toISOString(), zone),
    timeZone: zone,
    country: initial?.country ?? '',
    city: initial?.city ?? '',
    venue: initial?.venue ?? '',
    venuePrivate: initial ? initial.venueHidden : false,
    onlineUrl: initial?.onlineUrl ?? '',
    registration: initial?.registration ?? 'NONE',
    registrationUrl: initial?.registrationUrl ?? '',
    capacity: initial?.capacity ? String(initial.capacity) : '',
    hostName: initial?.hostName ?? '',
    contact: initial?.contact ?? '',
    calendarDayId: initial?.calendarDay?.id ?? '',
  });
  const [sessions, setSessions] = useState<EventSessionData[]>(initial?.sessions ?? []);
  const [speakers, setSpeakers] = useState(initial?.speakers ?? []);
  const [faq, setFaq] = useState(initial?.faq ?? []);
  const [days, setDays] = useState<CalendarDayData[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.calendarYear(new Date().getFullYear()).then((r) => setDays(r.days)).catch(() => undefined); }, [api]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const template = (f.template || SUGGESTED[f.category]) as EventTemplate;

  const submit = async (publish: boolean) => {
    setBusy(true);
    setErr(null);
    const body: EventInput = {
      title: f.title.trim(),
      summary: f.summary.trim(),
      description: f.description,
      category: f.category,
      template,
      audience: f.audience,
      startsAt: fromLocalInput(f.startsAt, f.timeZone),
      endsAt: fromLocalInput(f.endsAt, f.timeZone),
      timeZone: f.timeZone,
      country: f.country.trim() || undefined,
      city: f.city.trim() || undefined,
      venue: f.venue.trim() || undefined,
      venuePublic: !f.venuePrivate,
      onlineUrl: f.onlineUrl.trim() || undefined,
      registration: f.registration,
      registrationUrl: f.registration === 'EXTERNAL' ? f.registrationUrl.trim() || undefined : undefined,
      capacity: f.registration === 'RSVP' && f.capacity ? Number(f.capacity) : undefined,
      hostName: f.hostName.trim() || undefined,
      contact: f.contact.trim() || undefined,
      calendarDayId: f.calendarDayId || undefined,
      speakers: speakers.filter((s) => s.name.trim()),
      faq: faq.filter((q) => q.q.trim() && q.a.trim()),
      sessions: sessions.filter((s) => s.title.trim()).map((s) => ({ title: s.title, startsAt: s.startsAt, endsAt: s.endsAt, stage: s.stage || undefined, host: s.host || undefined })),
      publish,
    };
    try {
      onDone(initial ? await api.updateEvent(initial.id, body) : await api.createEvent(body));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : tx(EV.error));
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, el: React.ReactNode, wide = false) => <label className={`ev-field ${wide ? 'wide' : ''}`}><span>{label}</span>{el}</label>;
  return (
    <form className="ev-form" onSubmit={(e) => { e.preventDefault(); submit(true); }} data-testid="ev-form">
      <div className="ev-form-preview">
        <EventCover template={template} seed={initial?.id ?? f.title ?? 'new'} />
        <p className="ev-muted small">{tx(EV.f_noUpload)}</p>
      </div>
      <div className="ev-form-grid">
        {field(tx(EV.f_title), <input id="ev-title" required minLength={3} maxLength={140} value={f.title} onChange={(e) => set('title', e.target.value)} />, true)}
        {field(tx(EV.f_summary), <input id="ev-summary" maxLength={300} value={f.summary} onChange={(e) => set('summary', e.target.value)} />, true)}
        {field(tx(EV.f_description), <textarea id="ev-description" rows={5} maxLength={8000} value={f.description} onChange={(e) => set('description', e.target.value)} />, true)}
        {field(tx(EV.f_category), (
          <select id="ev-category" value={f.category} onChange={(e) => set('category', e.target.value as EventCategory)}>
            {CATS.map((c) => <option key={c} value={c}>{tx(EV[`c_${c}` as keyof typeof EV] as Record<string, string>)}</option>)}
          </select>
        ))}
        {field(tx(EV.f_template), (
          <select id="ev-template" value={f.template} onChange={(e) => set('template', e.target.value as EventTemplate | '')}>
            <option value="">{tx(EV.f_templateAuto)}</option>
            {TEMPLATES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        ))}
        {field(tx(EV.f_starts), <input id="ev-starts" type="datetime-local" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} />)}
        {field(tx(EV.f_ends), <input id="ev-ends" type="datetime-local" required value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} />)}
        {field(tx(EV.f_timeZone), <input id="ev-tz" value={f.timeZone} onChange={(e) => set('timeZone', e.target.value)} dir="ltr" />)}
        {field(tx(EV.f_audience), (
          <select id="ev-audience" value={f.audience} onChange={(e) => set('audience', e.target.value as typeof f.audience)}>
            {(['PUBLIC', 'FRIENDS', 'PRIVATE'] as const).map((a) => <option key={a} value={a}>{tx(EV[`a_${a}`])}</option>)}
          </select>
        ))}
        {field(tx(EV.f_country), <input id="ev-country" maxLength={2} value={f.country} onChange={(e) => set('country', e.target.value.toUpperCase())} dir="ltr" />)}
        {field(tx(EV.f_city), <input id="ev-city" maxLength={80} value={f.city} onChange={(e) => set('city', e.target.value)} />)}
        {field(tx(EV.f_venue), <input id="ev-venue" maxLength={200} value={f.venue} onChange={(e) => set('venue', e.target.value)} />, true)}
        <label className="ev-check wide"><input type="checkbox" checked={f.venuePrivate} onChange={(e) => set('venuePrivate', e.target.checked)} /> {tx(EV.f_venuePrivate)}</label>
        {field(tx(EV.f_online), <input id="ev-online" type="url" pattern="https://.*" value={f.onlineUrl} onChange={(e) => set('onlineUrl', e.target.value)} dir="ltr" />, true)}
        {field(tx(EV.f_registration), (
          <select id="ev-registration" value={f.registration} onChange={(e) => set('registration', e.target.value as typeof f.registration)}>
            {(['NONE', 'RSVP', 'EXTERNAL'] as const).map((r) => <option key={r} value={r}>{tx(EV[`r_${r}`])}</option>)}
          </select>
        ))}
        {f.registration === 'RSVP' && field(tx(EV.f_capacity), <input id="ev-capacity" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />)}
        {f.registration === 'EXTERNAL' && field(tx(EV.f_regUrl), <input id="ev-regurl" type="url" pattern="https://.*" value={f.registrationUrl} onChange={(e) => set('registrationUrl', e.target.value)} dir="ltr" />)}
        {field(tx(EV.f_host), <input id="ev-host" maxLength={120} value={f.hostName} onChange={(e) => set('hostName', e.target.value)} />)}
        {field(tx(EV.f_contact), <input id="ev-contact" maxLength={200} value={f.contact} onChange={(e) => set('contact', e.target.value)} />)}
        {days.length > 0 && field(tx(EV.f_calendarDay), (
          <select id="ev-day" value={f.calendarDayId} onChange={(e) => set('calendarDayId', e.target.value)}>
            <option value="">{tx(EV.f_none)}</option>
            {days.map((d) => <option key={d.id} value={d.id}>{d.names.ku} — {nameIn(d.names, locale)}</option>)}
          </select>
        ), true)}
      </div>

      <fieldset className="ev-repeat">
        <legend>{tx(EV.f_program)}</legend>
        {sessions.map((s, i) => (
          <div key={i} className="ev-repeat-row">
            <input aria-label={tx(EV.f_title)} placeholder={tx(EV.f_title)} value={s.title} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <input aria-label={tx(EV.f_starts)} type="datetime-local" value={toLocalInput(s.startsAt, f.timeZone)} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, startsAt: fromLocalInput(e.target.value, f.timeZone) } : x)))} />
            <input aria-label={tx(EV.f_ends)} type="datetime-local" value={toLocalInput(s.endsAt, f.timeZone)} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, endsAt: fromLocalInput(e.target.value, f.timeZone) } : x)))} />
            <input aria-label={tx(EV.f_stage)} placeholder={tx(EV.f_stage)} value={s.stage ?? ''} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, stage: e.target.value } : x)))} />
            <input aria-label={tx(EV.f_itemHost)} placeholder={tx(EV.f_itemHost)} value={s.host ?? ''} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, host: e.target.value } : x)))} />
            <button type="button" className="ev-btn ghost" onClick={() => setSessions(sessions.filter((_, j) => j !== i))}>{tx(EV.remove)}</button>
          </div>
        ))}
        <button type="button" className="ev-btn" data-testid="ev-add-session" onClick={() => {
          const last = sessions[sessions.length - 1];
          const start = last ? last.endsAt : fromLocalInput(f.startsAt, f.timeZone);
          setSessions([...sessions, { title: '', startsAt: start, endsAt: new Date(new Date(start).getTime() + 36e5).toISOString(), stage: last?.stage ?? '', host: '' }]);
        }}>+ {tx(EV.f_addItem)}</button>
      </fieldset>

      <fieldset className="ev-repeat">
        <legend>{tx(EV.f_speakers)}</legend>
        {speakers.map((s, i) => (
          <div key={i} className="ev-repeat-row two">
            <input placeholder={tx(EV.f_name)} aria-label={tx(EV.f_name)} value={s.name} onChange={(e) => setSpeakers(speakers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input placeholder={tx(EV.f_role)} aria-label={tx(EV.f_role)} value={s.role ?? ''} onChange={(e) => setSpeakers(speakers.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
            <button type="button" className="ev-btn ghost" onClick={() => setSpeakers(speakers.filter((_, j) => j !== i))}>{tx(EV.remove)}</button>
          </div>
        ))}
        <button type="button" className="ev-btn" onClick={() => setSpeakers([...speakers, { name: '', role: '' }])}>+ {tx(EV.f_addSpeaker)}</button>
      </fieldset>

      <fieldset className="ev-repeat">
        <legend>{tx(EV.f_faq)}</legend>
        {faq.map((q, i) => (
          <div key={i} className="ev-repeat-row two">
            <input placeholder={tx(EV.f_question)} aria-label={tx(EV.f_question)} value={q.q} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <input placeholder={tx(EV.f_answer)} aria-label={tx(EV.f_answer)} value={q.a} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <button type="button" className="ev-btn ghost" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>{tx(EV.remove)}</button>
          </div>
        ))}
        <button type="button" className="ev-btn" onClick={() => setFaq([...faq, { q: '', a: '' }])}>+ {tx(EV.f_addFaq)}</button>
      </fieldset>

      {(f.category === 'YOUTH' || f.category === 'CHARITY') && <p className="ev-note">{tx(EV.f_reviewNote)}</p>}
      {err && <p className="ev-msg error" role="alert">{err}</p>}
      <div className="ev-actions">
        <button type="submit" className="ev-btn primary" disabled={busy} data-testid="ev-publish">{initial && initial.status === 'PUBLISHED' ? tx(EV.f_saveChanges) : tx(EV.f_publish)}</button>
        {(!initial || initial.status !== 'PUBLISHED') && <button type="button" className="ev-btn" disabled={busy} onClick={() => submit(false)} data-testid="ev-draft">{tx(EV.f_draft)}</button>}
        <button type="button" className="ev-btn ghost" onClick={onCancel}>{tx(EV.back)}</button>
      </div>
    </form>
  );
}
