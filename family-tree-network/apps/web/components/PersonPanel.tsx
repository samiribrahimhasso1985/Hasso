'use client';

import { useEffect, useState } from 'react';
import { photoSrc, type Api, type GraphEdge, type GraphNode, type ProfileDetail, type RelationshipDetail, type Visibility } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useConnectText } from '../lib/i18n-connect';
import { avatarFor } from './GraphCanvas';
import StatusBadge from './StatusBadge';

interface Props {
  api: Api;
  node: GraphNode;
  edges: GraphEdge[];
  nodes: Map<string, GraphNode>;
  isFocus: boolean;
  expanded: boolean;
  selectedEdgeId: string | null;
  onFocus: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onConnectFrom: () => void;
  /** Opens this member in EZIDINET CONNECT (friend request, follow, presence). */
  onOpenConnect?: () => void;
  onSelectEdge: (id: string | null) => void;
  onChanged: () => void;
}

export default function PersonPanel(p: Props) {
  const { t } = useI18n();
  const friendsLabel = useConnectText().friendsTab;
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  useEffect(() => {
    setProfile(null);
    p.api.profile(p.node.id).then(setProfile).catch(() => setProfile(null));
  }, [p.api, p.node.id]);

  const mine = p.edges.filter((e) => e.source === p.node.id || e.target === p.node.id);
  const relLabel = (e: GraphEdge) => (e.source === p.node.id ? e.inverseLabel : e.label); // what the other is to this person

  return (
    <div className="panel person" data-testid="person-panel">
      <header className="person-head">
        <img src={photoSrc(p.node.avatarUrl) ?? avatarFor(p.node.displayName, true)} alt="" width={64} height={64} data-testid="person-avatar" />
        <div>
          <h3>{profile?.fullName ?? p.node.displayName}</h3>
          {p.node.kinship && <div className="kinship">{p.node.kinship.label}</div>}
          <div className="tags">
            {p.node.isViewer && <span className="tag gold">{t.you}</span>}
            {p.node.isMinor && <span className="tag">🛡 {t.protectedMinor}</span>}
            {!p.node.claimed && !p.node.isMinor && <span className="tag">{t.managed}</span>}
            {p.node.deceased && <span className="tag">✝ {t.deceased}</span>}
          </div>
        </div>
      </header>
      <div className="actions">
        {!p.isFocus && (
          <button className="btn small gold" onClick={p.onFocus} data-testid="btn-focus">
            {t.focus}
          </button>
        )}
        {p.expanded ? (
          <button className="btn small" onClick={p.onCollapse}>
            {t.collapse}
          </button>
        ) : (
          p.node.hiddenNeighbours > 0 && (
            <button className="btn small" onClick={p.onExpand} data-testid="btn-expand">
              {t.expand} (+{p.node.hiddenNeighbours})
            </button>
          )
        )}
        <button className="btn small" onClick={p.onConnectFrom}>
          {t.howConnected}
        </button>
        {p.onOpenConnect && p.node.claimed && !p.node.deceased && (
          <button className="btn small" onClick={p.onOpenConnect} data-testid="btn-open-connect">
            {friendsLabel}
          </button>
        )}
      </div>
      {profile && (
        <dl className="facts">
          <Fact k={t.born} v={profile.birthDate} hidden={t.hidden} />
          {profile.deathDate && <Fact k={t.died} v={profile.deathDate} hidden={t.hidden} />}
          <Fact k={t.country} v={profile.country} hidden={t.hidden} />
          <Fact k={t.city} v={profile.city} hidden={t.hidden} />
          {profile.languages.length > 0 && <Fact k={t.languages} v={profile.languages.join(' · ')} hidden={t.hidden} />}
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </dl>
      )}
      <h4>
        {t.relationships} <span className="muted">({mine.length})</span>
      </h4>
      <ul className="rel-list">
        {mine.map((e) => {
          const other = p.nodes.get(e.source === p.node.id ? e.target : e.source);
          return (
            <li key={e.id} className={p.selectedEdgeId === e.id ? 'active' : ''}>
              <button className="rel-row" onClick={() => p.onSelectEdge(p.selectedEdgeId === e.id ? null : e.id)} data-testid={`rel-${e.id}`}>
                <span className="dot" style={{ background: e.color }} />
                <span className="rel-name">{other?.displayName}</span>
                <span className="rel-label">{e.typeKey === 'CUSTOM' ? e.label : relLabel(e)}</span>
                <StatusBadge status={e.status} />
              </button>
              {p.selectedEdgeId === e.id && <RelationshipDetailView api={p.api} id={e.id} onChanged={p.onChanged} />}
            </li>
          );
        })}
      </ul>
      <p className="muted small">{t.derivedNote}</p>
    </div>
  );
}

function Fact({ k, v, hidden }: { k: string; v: string | null; hidden: string }) {
  return (
    <div className="fact">
      <dt>{k}</dt>
      <dd className={v ? '' : 'muted'}>{v ?? `🔒 ${hidden}`}</dd>
    </div>
  );
}

export function RelationshipDetailView({ api, id, onChanged }: { api: Api; id: string; onChanged: () => void }) {
  const { t } = useI18n();
  const [d, setD] = useState<RelationshipDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.relationship(id).then(setD).catch((e) => setErr(e.message));
  }, [api, id]);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="muted small">{t.loading}</p>;
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      onChanged();
      setD(await api.relationship(id).catch(() => null));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const canAct = d.mySides.length > 0;
  return (
    <div className="rel-detail" data-testid="rel-detail">
      <p className="sentence">
        <strong>{d.from.displayName}</strong> {t.isThe} <span style={{ color: d.color }}>{d.label}</span> {t.of} <strong>{d.to.displayName}</strong>
      </p>
      {d.attributes.startDate && (
        <p className="small muted">
          {t.startDate}: {d.attributes.startDate}
          {d.attributes.endDate ? ` — ${t.endDate}: ${d.attributes.endDate}` : ''}
        </p>
      )}
      {d.sensitive && d.status === 'PENDING' && <p className="small note">{t.sensitiveNote}</p>}
      <h5>{t.verificationLog}</h5>
      <ol className="vlog">
        {d.verifications.map((v, i) => (
          <li key={i}>
            <span className={`vdec ${v.decision.toLowerCase()}`}>{v.decision === 'CONFIRM' ? t.confirm : v.decision === 'REJECT' ? t.reject : t.dispute}</span>{' '}
            {v.by ?? '—'} <span className="muted small">{new Date(v.at).toLocaleDateString()}</span>
          </li>
        ))}
      </ol>
      {canAct && (
        <div className="actions">
          {d.status !== 'CONFIRMED' && d.status !== 'REJECTED' && (
            <button className="btn small gold" onClick={() => act(() => api.decide(id, 'CONFIRM'))} data-testid="btn-confirm">
              {t.confirm}
            </button>
          )}
          {d.status === 'PENDING' && !d.createdByMe && (
            <button className="btn small" onClick={() => act(() => api.decide(id, 'REJECT'))}>
              {t.reject}
            </button>
          )}
          {d.status === 'CONFIRMED' && (
            <button className="btn small" onClick={() => act(() => api.decide(id, 'DISPUTE'))}>
              {t.dispute}
            </button>
          )}
          <label className="inline">
            {t.visibility}
            <select value={d.visibility} onChange={(e) => act(() => api.updateRelationship(id, { visibility: e.target.value as Visibility }))}>
              {(['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE'] as const).map((v) => (
                <option key={v} value={v}>
                  {v === 'FAMILY' ? t.FAMILY_VIS : t[v]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn small danger" onClick={() => act(() => api.deleteRelationship(id))}>
            {t.remove}
          </button>
        </div>
      )}
    </div>
  );
}
