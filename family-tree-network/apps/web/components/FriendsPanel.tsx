'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  photoSrc,
  type Api,
  type Audience,
  type ConnectCard,
  type ConnectPerson,
  type ConnectSettings,
  type FriendRequest,
  type Presence,
  type ProfileDetail,
  type StatusMode,
  type Suggestion,
} from '../lib/api';
import { useConnectText, type ConnectDict } from '../lib/i18n-connect';
import { avatarFor } from './GraphCanvas';

export type View = 'friends' | 'requests' | 'discover' | 'followers' | 'settings';

/** Online dot + label (only when the person allows the viewer to see it). */
export function PresenceDot({ presence, withLabel = false }: { presence: Presence | null; withLabel?: boolean }) {
  const c = useConnectText();
  if (!presence) return null;
  const label = c[`st_${presence.status}`];
  const seen = presence.lastSeen ? `${c.lastSeen}: ${new Date(presence.lastSeen).toLocaleString()}` : '';
  return (
    <span className={`presence ${presence.status.toLowerCase()}`} title={seen || label} data-testid="presence">
      <i aria-hidden="true" />
      {withLabel && <span>{label}{seen && presence.status === 'OFFLINE' ? ` · ${seen}` : ''}</span>}
      {!withLabel && <span className="sr-only">{label}</span>}
    </span>
  );
}

function Avatar({ p, size = 40 }: { p: { displayName: string; avatarUrl: string | null }; size?: number }) {
  return <img className="cn-avatar" src={photoSrc(p.avatarUrl) ?? avatarFor(p.displayName, false)} alt="" width={size} height={size} />;
}

/** EZIDINET CONNECT — friends, requests, discover, followers and privacy (Phase 1). */
export default function FriendsPanel({
  api,
  myProfileId,
  onChanged,
  onCount,
  openPersonId,
  initialView = 'friends',
}: {
  api: Api;
  myProfileId: string;
  onChanged: () => void;
  onCount: (n: number) => void;
  openPersonId?: string | null;
  initialView?: View;
}) {
  const c = useConnectText();
  const [view, setView] = useState<View>(initialView);
  useEffect(() => setView(initialView), [initialView]);
  const [person, setPerson] = useState<string | null>(openPersonId ?? null);

  useEffect(() => { if (openPersonId) setPerson(openPersonId); }, [openPersonId]);
  const refreshCount = useCallback(() => api.connectSummary().then((s) => onCount(s.incomingRequests)).catch(() => undefined), [api, onCount]);
  useEffect(() => { refreshCount(); }, [refreshCount]);

  const changed = () => { refreshCount(); onChanged(); };

  return (
    <div className="panel friends" data-testid="friends-panel">
      {person ? (
        <PersonCard api={api} id={person} self={person === myProfileId} onBack={() => setPerson(null)} onOpen={setPerson} onChanged={changed} />
      ) : (
        <>
          <nav className="cn-views" role="tablist">
            {(['friends', 'requests', 'discover', 'followers', 'settings'] as View[]).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)} data-testid={`cn-${v}`}>
                {v === 'friends' ? c.myFriends : v === 'requests' ? c.requests : v === 'discover' ? c.discover : v === 'followers' ? c.followersTab : c.settings}
              </button>
            ))}
          </nav>
          {view === 'friends' && <FriendList api={api} onOpen={setPerson} />}
          {view === 'requests' && <Requests api={api} onOpen={setPerson} onChanged={changed} />}
          {view === 'discover' && <Discover api={api} onOpen={setPerson} />}
          {view === 'followers' && <Follows api={api} onOpen={setPerson} />}
          {view === 'settings' && (
            <>
              <FindMe api={api} profileId={myProfileId} />
              <Settings api={api} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function PersonRow({ p, onOpen, extra, children }: { p: ConnectPerson; onOpen: (id: string) => void; extra?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="cn-row" data-testid={`cn-row-${p.id}`}>
      <button type="button" className="cn-who" onClick={() => onOpen(p.id)}>
        <span className="cn-avatar-wrap">
          <Avatar p={p} />
          <PresenceDot presence={p.presence} />
        </span>
        <span className="cn-name">
          <strong>{p.displayName}</strong>
          {extra && <small className="muted">{extra}</small>}
        </span>
      </button>
      {children && <div className="cn-actions">{children}</div>}
    </li>
  );
}

function FriendList({ api, onOpen }: { api: Api; onOpen: (id: string) => void }) {
  const c = useConnectText();
  const [items, setItems] = useState<ConnectPerson[] | null>(null);
  useEffect(() => { api.friends().then((r) => setItems(r.items)).catch(() => setItems([])); }, [api]);
  if (!items) return <p className="muted">…</p>;
  if (!items.length) return <p className="muted" data-testid="cn-no-friends">{c.noFriends}</p>;
  return (
    <ul className="cn-list" data-testid="cn-friend-list">
      {items.map((p) => <PersonRow key={p.id} p={p} onOpen={onOpen} extra={p.presence ? c[`st_${p.presence.status}`] : undefined} />)}
    </ul>
  );
}

function Requests({ api, onOpen, onChanged }: { api: Api; onOpen: (id: string) => void; onChanged: () => void }) {
  const c = useConnectText();
  const [dir, setDir] = useState<'incoming' | 'outgoing'>('incoming');
  const [items, setItems] = useState<FriendRequest[] | null>(null);
  const load = useCallback(() => api.friendRequests(dir).then(setItems).catch(() => setItems([])), [api, dir]);
  useEffect(() => { setItems(null); load(); }, [load]);
  const act = async (fn: () => Promise<unknown>) => { await fn().catch(() => undefined); await load(); onChanged(); };
  return (
    <>
      <div className="segmented">
        <button className={dir === 'incoming' ? 'active' : ''} onClick={() => setDir('incoming')} data-testid="cn-incoming">{c.incoming}</button>
        <button className={dir === 'outgoing' ? 'active' : ''} onClick={() => setDir('outgoing')} data-testid="cn-outgoing">{c.outgoing}</button>
      </div>
      {!items && <p className="muted">…</p>}
      {items?.length === 0 && <p className="muted">{dir === 'incoming' ? c.noIncoming : c.noOutgoing}</p>}
      <ul className="cn-list">
        {items?.map((r) => (
          <PersonRow key={r.id} p={r.person} onOpen={onOpen} extra={r.mutualFriends ? c.mutual(r.mutualFriends) : undefined}>
            {dir === 'incoming' ? (
              <>
                <button className="btn small gold" onClick={() => act(() => api.acceptFriend(r.id))} data-testid={`cn-accept-${r.person.id}`}>{c.accept}</button>
                <button className="btn small" onClick={() => act(() => api.rejectFriend(r.id))} data-testid={`cn-reject-${r.person.id}`}>{c.reject}</button>
              </>
            ) : (
              <button className="btn small" onClick={() => act(() => api.cancelFriendRequest(r.id))} data-testid={`cn-cancel-${r.person.id}`}>{c.cancelRequest}</button>
            )}
          </PersonRow>
        ))}
      </ul>
    </>
  );
}

function reasonText(c: ConnectDict, s: Suggestion) {
  const parts = [];
  if (s.reasons.mutualFriends) parts.push(c.mutual(s.reasons.mutualFriends));
  if (s.reasons.sharedLanguages.length) parts.push(`${c.sharedLang} ${s.reasons.sharedLanguages.map((l) => l.toUpperCase()).join(', ')}`);
  if (s.reasons.sharedInterests?.length) parts.push(`${c.sharedInterests}: ${s.reasons.sharedInterests.join(', ')}`);
  if (s.reasons.sharedSkills?.length) parts.push(`${c.sharedSkills}: ${s.reasons.sharedSkills.join(', ')}`);
  if (!parts.length && (s.skills?.length || s.interests?.length)) parts.push([...(s.skills ?? []), ...(s.interests ?? [])].slice(0, 4).join(' · '));
  return parts.join(' · ') || undefined;
}

function Discover({ api, onOpen }: { api: Api; onOpen: (id: string) => void }) {
  const c = useConnectText();
  const [q, setQ] = useState('');
  const [lang, setLang] = useState('');
  const [interest, setInterest] = useState('');
  const [skill, setSkill] = useState('');
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const filtering = q.trim().length >= 2 || lang || interest.trim().length >= 2 || skill.trim().length >= 2;
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .discover(q.trim().length >= 2 ? q.trim() : undefined, { lang: lang || undefined, interest: interest.trim().length >= 2 ? interest.trim() : undefined, skill: skill.trim().length >= 2 ? skill.trim() : undefined })
        .then(setItems)
        .catch(() => setItems([]));
    }, filtering ? 300 : 0);
    return () => clearTimeout(t);
  }, [api, q, lang, interest, skill, filtering]);
  return (
    <>
      <input className="cn-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.searchPeople} aria-label={c.searchPeople} data-testid="cn-search" />
      <div className="cn-filters">
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={c.filterLang} data-testid="cn-filter-lang">
          <option value="">{c.anyLang}</option>
          {LANG_CODES.map((l) => <option key={l} value={l}>{langName(l)}</option>)}
        </select>
        <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder={c.filterInterest} aria-label={c.filterInterest} data-testid="cn-filter-interest" />
        <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={c.filterSkill} aria-label={c.filterSkill} data-testid="cn-filter-skill" />
      </div>
      {!filtering && <h4 className="cn-sub">{c.suggestions}</h4>}
      {!items && <p className="muted">…</p>}
      {items?.length === 0 && <p className="muted">{filtering ? c.noResults : c.noSuggestions}</p>}
      <ul className="cn-list" data-testid="cn-discover-list">
        {items?.map((s) => <PersonRow key={s.id} p={s} onOpen={onOpen} extra={reasonText(c, s)} />)}
      </ul>
      <p className="small muted cn-note">{c.privacyNote}</p>
    </>
  );
}

function Follows({ api, onOpen }: { api: Api; onOpen: (id: string) => void }) {
  const c = useConnectText();
  const [which, setWhich] = useState<'followers' | 'following'>('followers');
  const [items, setItems] = useState<ConnectPerson[] | null>(null);
  useEffect(() => {
    setItems(null);
    (which === 'followers' ? api.followers() : api.following()).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [api, which]);
  return (
    <>
      <div className="segmented">
        <button className={which === 'followers' ? 'active' : ''} onClick={() => setWhich('followers')}>{c.followers}</button>
        <button className={which === 'following' ? 'active' : ''} onClick={() => setWhich('following')} data-testid="cn-following">{c.following}</button>
      </div>
      {items?.length === 0 && <p className="muted">{which === 'followers' ? c.noFollowers : c.noFollowing}</p>}
      <ul className="cn-list">{items?.map((p) => <PersonRow key={p.id} p={p} onOpen={onOpen} />)}</ul>
    </>
  );
}

/** Languages offered in the picker (ISO 639-1); members choose, nothing is inferred. */
const LANG_CODES = ['ku', 'ar', 'de', 'en', 'tr', 'hy', 'ka', 'ru', 'fr', 'nl', 'sv', 'fa'];
const langName = (code: string) => {
  try {
    return new Intl.DisplayNames([typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};
const splitTags = (s: string) => s.split(/[,،]/).map((x) => x.trim()).filter((x) => x.length >= 2);

/** What others may use to find me: discoverable switch, languages, interests, skills — each with its own audience. */
function FindMe({ api, profileId }: { api: Api; profileId: string }) {
  const c = useConnectText();
  const [p, setP] = useState<ProfileDetail | null>(null);
  const [langs, setLangs] = useState<string[]>([]);
  const [interests, setInterests] = useState('');
  const [skills, setSkills] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api.profile(profileId).then((x) => {
    setP(x);
    setLangs(x.languages);
    setInterests(x.interests.join(', '));
    setSkills(x.skills.join(', '));
  }).catch(() => undefined), [api, profileId]);
  useEffect(() => { load(); }, [load]);
  if (!p) return null;
  const save = async () => {
    setMsg(null);
    try {
      const r = await api.updateProfile(profileId, { languages: langs, interests: splitTags(interests), skills: splitTags(skills) });
      setP(r);
      setInterests(r.interests.join(', '));
      setSkills(r.skills.join(', '));
      setMsg(c.saved);
    } catch {
      setMsg(c.errorGeneric);
    }
  };
  const vis = (field: 'LANGUAGES' | 'INTERESTS' | 'SKILLS') => (
    <label className="cn-vis">
      {c.visibleTo}
      <select value={p.privacy?.[field] ?? 'PUBLIC'} onChange={async (e) => {
        const v = e.target.value as 'PUBLIC';
        setP({ ...p, privacy: { ...(p.privacy ?? {}), [field]: v } });
        setP(await api.setFieldPrivacy(profileId, field, v).catch(() => p));
      }} data-testid={`cn-vis-${field}`}>
        {(['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE'] as const).map((v) => <option key={v} value={v}>{c[`v_${v}`]}</option>)}
      </select>
    </label>
  );
  return (
    <section className="cn-findme" data-testid="cn-findme">
      <h4 className="cn-sub">{c.findMe}</h4>
      <p className="small muted">{c.findMeHelp}</p>
      <label className="check">
        <input type="checkbox" checked={Boolean(p.searchable)} onChange={async (e) => {
          const on = e.target.checked;
          setP({ ...p, searchable: on }); // show the choice at once; the server answer confirms it
          setP(await api.updateProfile(profileId, { searchable: on }).catch(() => ({ ...p, searchable: !on })));
        }} data-testid="cn-discoverable" /> {c.discoverable}
      </label>
      <fieldset className="cn-langs">
        <legend>{c.myLanguages}</legend>
        {LANG_CODES.map((l) => (
          <label key={l} className="cn-lang">
            <input type="checkbox" checked={langs.includes(l)} onChange={(e) => setLangs(e.target.checked ? [...langs, l] : langs.filter((x) => x !== l))} data-testid={`cn-lang-${l}`} /> {langName(l)}
          </label>
        ))}
      </fieldset>
      {vis('LANGUAGES')}
      <label className="cn-setting">
        {c.myInterests}
        <input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder={c.tagsHelp} data-testid="cn-interests" />
      </label>
      {vis('INTERESTS')}
      <label className="cn-setting">
        {c.mySkills}
        <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={c.tagsHelp} data-testid="cn-skills" />
      </label>
      {vis('SKILLS')}
      <button type="button" className="btn small gold" onClick={save} data-testid="cn-findme-save">{c.saveProfile}</button>
      {msg && <p className="small success" role="status">{msg}</p>}
    </section>
  );
}

function Settings({ api }: { api: Api }) {
  const c = useConnectText();
  const [s, setS] = useState<ConnectSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { api.connectSettings().then(setS).catch(() => undefined); }, [api]);
  if (!s) return <p className="muted">…</p>;
  const save = async (patch: Partial<Omit<ConnectSettings, 'options'>>) => {
    setMsg(null);
    try {
      setS(await api.updateConnectSettings(patch));
      setMsg(c.saved);
    } catch {
      setMsg(c.errorGeneric);
    }
  };
  const select = (field: keyof ConnectSettings['options'], label: string) => (
    <label className="cn-setting">
      {label}
      <select value={s[field]} onChange={(e) => save({ [field]: e.target.value as Audience })} data-testid={`cn-set-${field}`}>
        {s.options[field].map((o) => <option key={o} value={o}>{c[`a_${o}`]}</option>)}
      </select>
    </label>
  );
  return (
    <div className="cn-settings" data-testid="cn-settings">
      <label className="cn-setting">
        {c.myStatus}
        <select value={s.statusMode} onChange={(e) => save({ statusMode: e.target.value as StatusMode })} data-testid="cn-set-status">
          {(['ONLINE', 'BUSY', 'AWAY', 'INVISIBLE'] as StatusMode[]).map((m) => <option key={m} value={m}>{c[`st_${m}`]}</option>)}
        </select>
      </label>
      {select('friendRequestsFrom', c.whoRequests)}
      {select('followsFrom', c.whoFollows)}
      {select('presenceVisibleTo', c.whoPresence)}
      {select('friendListVisibleTo', c.whoFriendList)}
      <label className="check">
        <input type="checkbox" checked={s.showLastSeen} onChange={(e) => save({ showLastSeen: e.target.checked })} /> {c.showLastSeen}
      </label>
      {msg && <p className="small success" role="status">{msg}</p>}
      <p className="small muted cn-note">{c.privacyNote}</p>
    </div>
  );
}

/** A person as seen through CONNECT, with every allowed action. */
export function PersonCard({
  api,
  id,
  self,
  onBack,
  onOpen,
  onChanged,
}: {
  api: Api;
  id: string;
  self: boolean;
  onBack?: () => void;
  onOpen?: (id: string) => void;
  onChanged: () => void;
}) {
  const c = useConnectText();
  const [card, setCard] = useState<ConnectCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.connectPerson(id).then(setCard).catch((e) => setErr(e instanceof ApiError && e.status === 404 ? null : c.errorGeneric)), [api, id, c]);
  useEffect(() => { setCard(null); load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : c.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  if (!card) return <div className="cn-card">{onBack && <button className="btn small ghost" onClick={onBack}>‹ {c.back}</button>}{err && <p className="error">{err}</p>}</div>;
  const st = card.friendship.state;
  const rid = card.friendship.requestId;
  return (
    <div className="cn-card" data-testid="cn-card">
      {onBack && <button className="btn small ghost" onClick={onBack} data-testid="cn-back">‹ {c.back}</button>}
      <div className="cn-card-head">
        <span className="cn-avatar-wrap big">
          <Avatar p={card.person} size={72} />
        </span>
        <div>
          <h3>{card.person.displayName}</h3>
          <PresenceDot presence={card.presence} withLabel />
          <p className="small muted">
            {c.followersCount(card.followers)}
            {card.followsMe && <> · {c.followsYou}</>}
          </p>
        </div>
      </div>
      {!self && (
        <div className="cn-card-actions" aria-busy={busy}>
          {st === 'NONE' && card.can.sendRequest && <button className="btn small gold" disabled={busy} onClick={() => act(() => api.sendFriendRequest(id))} data-testid="cn-add">{c.addFriend}</button>}
          {st === 'REQUEST_SENT' && rid && (
            <>
              <span className="cn-state">{c.requestSent}</span>
              <button className="btn small" disabled={busy} onClick={() => act(() => api.cancelFriendRequest(rid))} data-testid="cn-cancel">{c.cancelRequest}</button>
            </>
          )}
          {st === 'REQUEST_RECEIVED' && rid && (
            <>
              <button className="btn small gold" disabled={busy} onClick={() => act(() => api.acceptFriend(rid))} data-testid="cn-accept">{c.accept}</button>
              <button className="btn small" disabled={busy} onClick={() => act(() => api.rejectFriend(rid))} data-testid="cn-reject">{c.reject}</button>
            </>
          )}
          {st === 'FRIENDS' && (
            <>
              <span className="cn-state ok" data-testid="cn-are-friends">✓ {c.friends}</span>
              <button className="btn small" disabled={busy} onClick={() => act(() => api.removeFriend(id), c.confirmRemove)} data-testid="cn-remove">{c.removeFriend}</button>
            </>
          )}
          {st === 'DECLINED' && <span className="cn-state">{c.declined}</span>}
          {card.can.follow && <button className="btn small" disabled={busy} onClick={() => act(() => api.follow(id))} data-testid="cn-follow">{c.follow}</button>}
          {card.can.unfollow && <button className="btn small" disabled={busy} onClick={() => act(() => api.unfollow(id))} data-testid="cn-unfollow">{c.unfollow}</button>}
          {st === 'BLOCKED' ? (
            <>
              <span className="cn-state">{c.blocked}</span>
              <button className="btn small" disabled={busy} onClick={() => act(() => api.unblock(id))} data-testid="cn-unblock">{c.unblock}</button>
            </>
          ) : (
            <button className="btn small danger" disabled={busy} onClick={() => act(() => api.block(id), c.confirmBlock)} data-testid="cn-block">{c.block}</button>
          )}
        </div>
      )}
      {err && <p className="error small" role="alert">{err}</p>}
      {card.mutualFriends.count > 0 && (
        <>
          <h4 className="cn-sub">{c.mutual(card.mutualFriends.count)}</h4>
          <ul className="cn-list">
            {card.mutualFriends.people.map((p) => <PersonRow key={p.id} p={p} onOpen={(x) => onOpen?.(x)} />)}
          </ul>
        </>
      )}
    </div>
  );
}
