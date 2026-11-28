'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { photoSrc, type Api, type AppNotification, type NotificationCategory, type NotificationPrefs } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useNotifyText } from '../lib/i18n-notify';
import { avatarFor } from './GraphCanvas';

/** Categories that something in EZIDINET actually sends today (no switches for features that do not exist yet). */
const ACTIVE: NotificationCategory[] = ['FRIENDS', 'FOLLOWS', 'RELATIONSHIPS', 'EVENTS'];

const toTime = (m: number | null) => (m === null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
const fromTime = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * Notification centre (unified CONNECT notification service): bell with unread count, history with read state,
 * and preferences — categories, do not disturb, quiet hours. Opening a notification leads to where it can be acted on.
 */
export default function NotificationBell({ api, onOpen }: { api: Api; onOpen: (n: AppNotification) => void }) {
  const nt = useNotifyText();
  const { locale, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'settings'>('list');
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => api.unreadNotifications().then((r) => setUnread(r.unread)).catch(() => undefined), [api]);
  // Until the real-time channel exists, the count is refreshed every 30 s while the page is visible.
  useEffect(() => {
    refreshCount();
    const t = setInterval(() => { if (!document.hidden) refreshCount(); }, 30_000);
    return () => clearInterval(t);
  }, [refreshCount]);

  const load = useCallback(async () => {
    const r = await api.notifications().catch(() => null);
    if (!r) return setItems([]);
    setItems(r.items);
    setNext(r.next);
    setUnread(r.unread);
  }, [api]);
  useEffect(() => { if (open) { setView('list'); load(); } }, [open, load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);

  const text = (n: AppNotification) => (nt.types[n.type] ?? ((x: string) => `${x}`))(n.actor?.displayName ?? nt.someone);
  const when = (iso: string) => new Date(iso).toLocaleString(locale === 'ku' ? 'en' : locale, { dateStyle: 'short', timeStyle: 'short' });

  const activate = async (n: AppNotification) => {
    if (!n.read) {
      const r = await api.readNotification(n.id).catch(() => null);
      if (r) setUnread(r.unread);
    }
    setOpen(false);
    onOpen(n);
  };

  return (
    <div className="nt" ref={box}>
      <button type="button" className="nt-bell" aria-label={nt.open} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="nt-bell">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {unread > 0 && <span className="nt-count" data-testid="nt-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="nt-panel card" role="dialog" aria-label={nt.title} dir={dir} data-testid="nt-panel">
          {view === 'list' ? (
            <>
              <div className="nt-head">
                <h3>{nt.title}</h3>
                <div className="nt-head-actions">
                  {unread > 0 && (
                    <button type="button" className="btn small ghost" onClick={async () => { await api.readAllNotifications().catch(() => undefined); await load(); }} data-testid="nt-read-all">
                      {nt.markAll}
                    </button>
                  )}
                  <button type="button" className="btn small ghost" onClick={() => setView('settings')} data-testid="nt-settings">{nt.settings}</button>
                </div>
              </div>
              {items === null && <p className="muted small">…</p>}
              {items?.length === 0 && <p className="muted small" data-testid="nt-empty">{nt.empty}</p>}
              <ul className="nt-list">
                {items?.map((n) => (
                  <li key={n.id}>
                    <button type="button" className={`nt-item ${n.read ? '' : 'unread'}`} onClick={() => activate(n)} data-testid={`nt-item-${n.type}`}>
                      <img src={(n.actor && photoSrc(n.actor.avatarUrl)) ?? avatarFor(n.actor?.displayName ?? '?', false)} alt="" width={36} height={36} />
                      <span>
                        <span className="nt-text">{text(n)}</span>
                        <small className="muted">{when(n.createdAt)}{n.silent ? ' · 🔕' : ''}</small>
                      </span>
                      {!n.read && <i className="nt-dot" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
              {next && (
                <button type="button" className="btn small ghost nt-more" onClick={async () => {
                  const r = await api.notifications(next).catch(() => null);
                  if (r) { setItems([...(items ?? []), ...r.items]); setNext(r.next); }
                }}>{nt.more}</button>
              )}
            </>
          ) : (
            <Prefs api={api} onBack={() => setView('list')} />
          )}
        </div>
      )}
    </div>
  );
}

function Prefs({ api, onBack }: { api: Api; onBack: () => void }) {
  const nt = useNotifyText();
  const { locale } = useI18n();
  const [p, setP] = useState<NotificationPrefs | null>(null);
  const [from, setFrom] = useState('22:00');
  const [to, setTo] = useState('07:00');
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    api.notificationPrefs().then((x) => {
      setP(x);
      if (x.quietStart !== null) setFrom(toTime(x.quietStart));
      if (x.quietEnd !== null) setTo(toTime(x.quietEnd));
    }).catch(() => undefined);
  }, [api]);
  if (!p) return <p className="muted small">…</p>;
  const save = async (body: Parameters<Api['updateNotificationPrefs']>[0]) => {
    setMsg(null);
    const r = await api.updateNotificationPrefs(body).catch(() => null);
    if (r) { setP(r); setMsg(nt.saved); }
  };
  const dndOn = p.dndUntil && new Date(p.dndUntil) > new Date();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return (
    <div className="nt-prefs" data-testid="nt-prefs">
      <button type="button" className="btn small ghost" onClick={onBack}>‹ {nt.back}</button>
      <h4>{nt.receive}</h4>
      {ACTIVE.map((c) => (
        <label key={c} className="check">
          <input
            type="checkbox"
            checked={!p.mutedCategories.includes(c)}
            onChange={(e) => {
              const muted = e.target.checked ? p.mutedCategories.filter((x) => x !== c) : [...p.mutedCategories, c];
              setP({ ...p, mutedCategories: muted }); // show the choice at once; the server answer confirms it
              save({ mutedCategories: muted });
            }}
            data-testid={`nt-cat-${c}`}
          />{' '}
          {nt.categories[c]}
        </label>
      ))}
      <h4>{nt.dnd}</h4>
      {dndOn && <p className="small" data-testid="nt-dnd-on">{nt.dndActive(new Date(p.dndUntil!).toLocaleTimeString(locale === 'ku' ? 'en' : locale, { hour: '2-digit', minute: '2-digit' }))}</p>}
      <div className="segmented">
        <button className={!dndOn ? 'active' : ''} onClick={() => save({ dndMinutes: null })}>{nt.dndOff}</button>
        <button onClick={() => save({ dndMinutes: 60 })} data-testid="nt-dnd-1h">{nt.dnd1h}</button>
        <button onClick={() => save({ dndMinutes: 480 })}>{nt.dnd8h}</button>
      </div>
      <h4>{nt.quiet}</h4>
      <div className="nt-quiet">
        <label>{nt.quietFrom} <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>{nt.quietTo} <input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="nt-quiet-actions">
        <button className="btn small gold" onClick={() => save({ quietStart: fromTime(from), quietEnd: fromTime(to), timeZone: zone })} data-testid="nt-quiet-save">{nt.quietSave}</button>
        {p.quietStart !== null && <button className="btn small" onClick={() => save({ quietStart: null, quietEnd: null })}>{nt.quietOff}</button>}
      </div>
      {msg && <p className="small success" role="status">{msg}</p>}
      <p className="small muted">{nt.silentNote}</p>
      <p className="small muted">{nt.pushLater}</p>
    </div>
  );
}
