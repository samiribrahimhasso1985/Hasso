'use client';

import { useCallback, useEffect, useState } from 'react';
import { photoSrc, type Api, type ConnectPerson } from '../lib/api';
import { useConnectText } from '../lib/i18n-connect';
import { useNotifyText } from '../lib/i18n-notify';
import FriendsPanel, { PresenceDot, type View } from './FriendsPanel';
import { avatarFor } from './GraphCanvas';

type Hub = 'home' | 'connections' | 'discover';
type HomeData = Awaited<ReturnType<Api['connectHome']>>;

/**
 * EZIDINET CONNECT area: side menu (desktop) / chips (phone) with the hubs that already work, and the CONNECT Home.
 * Hubs that are not built yet are not shown as buttons (no placeholders); a note says they will follow.
 */
export default function ConnectArea({ api, myProfileId, onChanged }: { api: Api; myProfileId: string; onChanged: () => void }) {
  const c = useConnectText();
  const [hub, setHub] = useState<Hub>('home');
  const [person, setPerson] = useState<string | null>(null);
  const [view, setView] = useState<View>('friends');

  const open = (h: Hub, v: View = 'friends', p: string | null = null) => {
    setHub(h);
    setView(v);
    setPerson(p);
  };

  return (
    <div className="cx" data-testid="connect-area">
      <nav className="cx-nav" aria-label="CONNECT">
        {(['home', 'connections', 'discover'] as Hub[]).map((h) => (
          <button key={h} type="button" className={hub === h ? 'active' : ''} aria-current={hub === h ? 'page' : undefined} onClick={() => open(h, h === 'discover' ? 'discover' : 'friends')} data-testid={`cx-nav-${h}`}>
            <span aria-hidden="true">{h === 'home' ? '⌂' : h === 'connections' ? '◎' : '⌕'}</span>
            {h === 'home' ? c.hubHome : h === 'connections' ? c.hubConnections : c.hubDiscover}
          </button>
        ))}
        <p className="small muted cx-more">{c.moreHubs}</p>
      </nav>
      <section className="cx-main">
        {hub === 'home' ? (
          <Home api={api} onPerson={(id) => open('connections', 'friends', id)} onGo={(h, v) => open(h, v)} onChanged={onChanged} />
        ) : (
          <FriendsPanel api={api} myProfileId={myProfileId} initialView={view} openPersonId={person} onChanged={onChanged} onCount={() => undefined} />
        )}
      </section>
    </div>
  );
}

function Face({ p, onClick }: { p: ConnectPerson; onClick: () => void }) {
  return (
    <button type="button" className="cx-face" onClick={onClick} title={p.displayName} data-testid={`cx-face-${p.id}`}>
      <span className="cn-avatar-wrap">
        <img className="cn-avatar" src={photoSrc(p.avatarUrl) ?? avatarFor(p.displayName, false)} alt="" width={52} height={52} />
        <PresenceDot presence={p.presence} />
      </span>
      <span className="cx-face-name">{p.displayName}</span>
    </button>
  );
}

function Home({ api, onPerson, onGo, onChanged }: { api: Api; onPerson: (id: string) => void; onGo: (h: Hub, v: View) => void; onChanged: () => void }) {
  const c = useConnectText();
  const nt = useNotifyText();
  const [d, setD] = useState<HomeData | null>(null);
  const load = useCallback(() => api.connectHome().then(setD).catch(() => undefined), [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="muted">…</p>;
  const answer = async (id: string, accept: boolean) => {
    await (accept ? api.acceptFriend(id) : api.rejectFriend(id)).catch(() => undefined);
    await load();
    onChanged();
  };
  return (
    <div className="cx-home" data-testid="cx-home">
      <header className="cx-welcome">
        <h2>{c.welcome(d.displayName)}</h2>
        <p className="muted">{c.homeIntro}</p>
        <div className="cx-stats">
          <button type="button" onClick={() => onGo('connections', 'friends')}><strong data-testid="cx-stat-friends">{d.counts.friends}</strong>{c.statFriends}</button>
          <button type="button" onClick={() => onGo('connections', 'requests')}><strong>{d.counts.incomingRequests}</strong>{c.statRequests}</button>
          <button type="button" onClick={() => onGo('connections', 'followers')}><strong>{d.counts.followers}</strong>{c.statFollowers}</button>
          <button type="button" onClick={() => onGo('connections', 'followers')}><strong>{d.counts.following}</strong>{c.statFollowing}</button>
        </div>
      </header>

      {d.requests.length > 0 && (
        <article className="card cx-card" data-testid="cx-requests">
          <h3>{c.waiting}</h3>
          <ul className="cn-list">
            {d.requests.map((r) => (
              <li key={r.id} className="cn-row">
                <button type="button" className="cn-who" onClick={() => onPerson(r.person.id)}>
                  <img className="cn-avatar" src={photoSrc(r.person.avatarUrl) ?? avatarFor(r.person.displayName, false)} alt="" width={40} height={40} />
                  <span className="cn-name"><strong>{r.person.displayName}</strong>{r.mutualFriends > 0 && <small className="muted">{c.mutual(r.mutualFriends)}</small>}</span>
                </button>
                <div className="cn-actions">
                  <button className="btn small gold" onClick={() => answer(r.id, true)} data-testid={`cx-accept-${r.person.id}`}>{c.accept}</button>
                  <button className="btn small" onClick={() => answer(r.id, false)}>{c.reject}</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="cx-grid">
        <article className="card cx-card" data-testid="cx-online">
          <h3>{c.onlineNow}</h3>
          {d.online.length ? (
            <div className="cx-faces">{d.online.map((p) => <Face key={p.id} p={p} onClick={() => onPerson(p.id)} />)}</div>
          ) : (
            <p className="small muted">{c.noOnline}</p>
          )}
        </article>

        <article className="card cx-card" data-testid="cx-recent">
          <h3>{c.recentTitle}</h3>
          {d.notifications.length ? (
            <ul className="cx-notes">
              {d.notifications.map((n) => (
                <li key={n.id} className={n.read ? '' : 'unread'}>
                  {(nt.types[n.type] ?? ((x: string) => x))(n.actor?.displayName ?? nt.someone)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">{c.noRecent}</p>
          )}
        </article>
      </div>

      <article className="card cx-card" data-testid="cx-suggestions">
        <div className="cx-card-head">
          <h3>{c.suggestionsTitle}</h3>
          <button type="button" className="btn small ghost" onClick={() => onGo('discover', 'discover')}>{c.seeAll}</button>
        </div>
        {d.suggestions.length ? (
          <div className="cx-faces">{d.suggestions.map((p) => <Face key={p.id} p={p} onClick={() => onPerson(p.id)} />)}</div>
        ) : (
          <p className="small muted">{c.noSuggestions}</p>
        )}
      </article>
    </div>
  );
}
