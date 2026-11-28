'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Api, EventCardData, EventCategory, EventDetailData } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import CalendarSection from './CalendarSection';
import EventCard from './EventCard';
import EventDetail from './EventDetail';
import EventForm from './EventForm';
import { shareLink } from './format';
import StaffPanel from './StaffPanel';
import './events.css';

type Tab = 'discover' | 'calendar' | 'mine' | 'staff';
const CATS: EventCategory[] = ['CULTURAL_FESTIVAL', 'RELIGIOUS_CELEBRATION', 'COMMUNITY_GATHERING', 'HERITAGE_EXHIBITION', 'MUSIC', 'EDUCATIONAL', 'YOUTH', 'CHARITY', 'MEMORIAL', 'ONLINE', 'INTERNATIONAL_MEETUP'];

/** EZIDINET Events & ÊZÎDÎ Calendar hub: discover, calendar, my events, publish, staff tools. */
export default function EventsArea({ api, openId, onPerson }: { api: Api; openId?: string | null; onPerson?: (profileId: string) => void }) {
  const { tx } = useEv();
  const [tab, setTab] = useState<Tab>('discover');
  const [scope, setScope] = useState<'mine' | 'saved' | 'registered'>('mine');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<EventCardData[] | null>(null);
  const [staff, setStaff] = useState(false);
  const [open, setOpen] = useState<EventDetailData | null>(null);
  const [editing, setEditing] = useState<EventDetailData | 'new' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setItems(null);
    const q = tab === 'mine' ? { scope } : { category };
    api.events(q).then((r) => { setItems(r.items); setStaff(r.staff); }).catch(() => setItems([]));
  }, [api, tab, scope, category]);
  useEffect(() => { if (tab === 'discover' || tab === 'mine') load(); }, [load, tab]);
  const openEvent = useCallback((id: string) => { api.event(id).then((d) => { setOpen(d); setEditing(null); }).catch(() => undefined); }, [api]);
  useEffect(() => { if (openId) openEvent(openId); }, [openId, openEvent]);

  const toggleSave = async (e: EventCardData) => {
    const r = await api.saveEvent(e.id, !e.saved).catch(() => null);
    if (r) setItems((xs) => xs?.map((x) => (x.id === e.id ? { ...x, saved: r.saved } : x)) ?? null);
  };
  const share = async (e: EventCardData) => {
    const r = await shareLink(`${window.location.origin}/e/${e.id}`, e.title);
    if (r === 'copied') { setMsg(tx(EV.copied)); setTimeout(() => setMsg(null), 2500); }
  };

  let body: React.ReactNode;
  if (editing) {
    body = <EventForm api={api} initial={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onDone={(d) => { setEditing(null); setOpen(d); }} />;
  } else if (open) {
    body = <EventDetail api={api} data={open} onBack={() => { setOpen(null); load(); }} onChanged={setOpen} onEdit={() => setEditing(open)} onDeleted={() => { setOpen(null); load(); }} onPerson={onPerson} />;
  } else if (tab === 'calendar') {
    body = <CalendarSection api={api} onOpenEvent={openEvent} />;
  } else if (tab === 'staff') {
    body = <StaffPanel api={api} onOpenEvent={openEvent} />;
  } else {
    body = (
      <>
        {tab === 'discover' ? (
          <div className="ev-filters" role="group">
            <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>{tx(EV.allCategories)}</button>
            {CATS.map((c) => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{tx(EV[`c_${c}` as keyof typeof EV] as Record<string, string>)}</button>)}
          </div>
        ) : (
          <div className="ev-filters" role="group">
            {(['mine', 'saved', 'registered'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} data-testid={`ev-scope-${s}`}>
                {s === 'mine' ? tx(EV.scopeMine) : s === 'saved' ? tx(EV.scopeSaved) : tx(EV.scopeRegistered)}
              </button>
            ))}
          </div>
        )}
        {items === null && <p className="ev-muted">…</p>}
        {items?.length === 0 && <p className="ev-empty">{tx(EV.noEvents)}</p>}
        <div className="ev-grid" data-testid="ev-grid">
          {items?.map((e, i) => (
            <EventCard key={e.id} e={e} featured={tab === 'discover' && i === 0 && e.featured} onOpen={() => openEvent(e.id)} onSave={() => toggleSave(e)} onShare={() => share(e)} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="ev" data-testid="events-area">
      <nav className="ev-tabs" aria-label={tx(EV.hub)}>
        {(['discover', 'calendar', 'mine', ...(staff ? ['staff'] : [])] as Tab[]).map((x) => (
          <button key={x} type="button" aria-current={tab === x && !open && !editing ? 'page' : undefined} onClick={() => { setTab(x); setOpen(null); setEditing(null); }} data-testid={`ev-tab-${x}`}>
            {x === 'discover' ? tx(EV.discover) : x === 'calendar' ? tx(EV.calendar) : x === 'mine' ? tx(EV.mine) : tx(EV.staff)}
          </button>
        ))}
        <button type="button" className="ev-btn primary ev-new" onClick={() => { setOpen(null); setEditing('new'); }} data-testid="ev-new">+ {tx(EV.create)}</button>
      </nav>
      {msg && <p className="ev-msg" role="status">{msg}</p>}
      {body}
    </div>
  );
}
