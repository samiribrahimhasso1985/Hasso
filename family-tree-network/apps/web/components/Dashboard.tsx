'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Api, photoSrc, type Category, type GraphEdge, type GraphNode, type PathResult, type PersonSummary, type Session } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { CATEGORY } from '../lib/tokens';
import AddRelationshipDialog from './AddRelationshipDialog';
import ConnectPanel from './ConnectPanel';
import GraphCanvas, { avatarFor, type GraphCanvasHandle, type LayoutMode } from './GraphCanvas';
import IdentityPanel from './IdentityPanel';
import InboxPanel from './InboxPanel';
import LanguageSwitch from './LanguageSwitch';
import Legend from './Legend';
import AccountBanner from './AccountBanner';
import { Logo } from './Logo';
import PersonPanel from './PersonPanel';
import PersonPicker from './PersonPicker';

type Filter = 'ALL' | 'FAMILY' | 'FRIENDSHIP' | 'PROFESSIONAL' | 'SOCIAL';
const FILTER_CATEGORIES: Record<Filter, Category[] | undefined> = {
  ALL: undefined,
  FAMILY: ['FAMILY', 'UNION'],
  FRIENDSHIP: ['FRIENDSHIP'],
  PROFESSIONAL: ['PROFESSIONAL'],
  SOCIAL: ['SOCIAL', 'CUSTOM'],
};
const FILTER_COLORS: Record<Filter, string> = {
  ALL: '#30302D',
  FAMILY: CATEGORY.FAMILY,
  FRIENDSHIP: CATEGORY.FRIENDSHIP,
  PROFESSIONAL: CATEGORY.PROFESSIONAL,
  SOCIAL: CATEGORY.SOCIAL,
};

export default function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { t, locale, dir } = useI18n();
  const api = useMemo(() => new Api(session.accessToken, locale), [session.accessToken, locale]);
  const canvas = useRef<GraphCanvasHandle>(null);

  const [focusId, setFocusId] = useState(session.profileId);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [depth, setDepth] = useState(2);
  const [layout, setLayout] = useState<LayoutMode>('network');
  const [showLabels, setShowLabels] = useState(true);
  const [nodes, setNodes] = useState<Map<string, GraphNode>>(new Map());
  const [edges, setEdges] = useState<Map<string, GraphEdge>>(new Map());
  const [expansions, setExpansions] = useState<Map<string, string[]>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [tab, setTab] = useState<'person' | 'connect' | 'inbox' | 'identity'>('person');
  const [pathFrom, setPathFrom] = useState<PersonSummary | null>(null);
  const [pathTo, setPathTo] = useState<PersonSummary | null>(null);
  const [path, setPath] = useState<PathResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gen, setGen] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await api.ego({ center: focusId, depth, categories: FILTER_CATEGORIES[filter], relativeTo: focusId });
      setNodes(new Map(g.nodes.map((n) => [n.id, n])));
      setEdges(new Map(g.edges.map((e) => [e.id, e])));
      setExpansions(new Map());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, focusId, depth, filter]);

  useEffect(() => {
    // the welcome screen may have been scrolled (phones): start the dashboard at the top
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    api.awaiting().then((r) => setInboxCount(r.length)).catch(() => undefined);
  }, [api, refreshKey]);

  const expand = useCallback(
    async (id: string) => {
      try {
        const g = await api.ego({ center: id, depth: 1, categories: FILTER_CATEGORIES[filter], relativeTo: focusId });
        const added: string[] = [];
        setNodes((prev) => {
          const next = new Map(prev);
          for (const n of g.nodes) {
            if (!next.has(n.id)) added.push(n.id);
            next.set(n.id, { ...(next.get(n.id) ?? n), hiddenNeighbours: n.hiddenNeighbours, kinship: n.kinship, generation: n.generation });
          }
          return next;
        });
        setEdges((prev) => {
          const next = new Map(prev);
          for (const e of g.edges) next.set(e.id, e);
          return next;
        });
        setExpansions((prev) => new Map(prev).set(id, added));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [api, filter, focusId],
  );

  const collapse = useCallback((id: string) => {
    const added = expansions.get(id) ?? [];
    const keep = new Set<string>();
    for (const [k, v] of expansions) if (k !== id) v.forEach((x) => keep.add(x));
    const remove = new Set(added.filter((x) => !keep.has(x) && x !== focusId));
    setNodes((prev) => new Map([...prev].filter(([k]) => !remove.has(k))));
    setEdges((prev) => new Map([...prev].filter(([, e]) => !remove.has(e.source) && !remove.has(e.target))));
    setExpansions((prev) => {
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
  }, [expansions, focusId]);

  const nodeList = useMemo(() => [...nodes.values()], [nodes]);
  const edgeList = useMemo(() => [...edges.values()], [edges]);
  const me = nodes.get(session.profileId) ?? { id: session.profileId, displayName: session.displayName, gender: 'UNSPECIFIED' as const, avatarUrl: null, isMinor: false, claimed: true, deceased: false };
  const selectedNode = selected ? nodes.get(selected) ?? null : null;
  const highlight = useMemo(
    () => (path?.found ? { nodeIds: path.people.map((p) => p.id), edgeIds: path.steps.map((s) => s.edgeId) } : null),
    [path],
  );
  const gens = useMemo(() => [...new Set(nodeList.map((n) => n.generation).filter((g): g is number => g !== null))].sort((a, b) => a - b), [nodeList]);
  const stats = { people: nodes.size, connections: edges.size };

  const stepGen = (d: number) => {
    const i = gens.indexOf(gen);
    const next = gens[Math.min(gens.length - 1, Math.max(0, (i < 0 ? gens.indexOf(0) : i) + d))];
    if (next === undefined) return;
    if (layout !== 'generations') setLayout('generations');
    setGen(next);
    setTimeout(() => canvas.current?.focusGeneration(next), layout === 'generations' ? 0 : 650);
  };

  return (
    <div className="app" dir={dir}>
      <header className="topbar">
        <div className="brand">
          <Logo size={34} />
          <span>EZIDINET</span>
        </div>
        <div className="top-search">
          <PersonPicker
            api={api}
            value={null}
            known={nodeList}
            onChange={(p) => {
              if (!p) return;
              if (nodes.has(p.id)) {
                setSelected(p.id);
                setTab('person');
                canvas.current?.centerOn(p.id);
              } else {
                setFocusId(p.id);
                setSelected(p.id);
              }
            }}
            testId="global-search"
          />
        </div>
        <div className="top-actions">
          <button className="btn gold" onClick={() => setAdding(true)} data-testid="btn-add">
            + {t.addRelationship}
          </button>
          <LanguageSwitch />
          <span className="me">
            <img src={photoSrc(me.avatarUrl) ?? avatarFor(session.displayName, true)} alt="" width={30} height={30} data-testid="me-avatar" />
            {session.displayName}
          </span>
          <button className="btn ghost" onClick={onLogout}>
            {t.logout}
          </button>
        </div>
      </header>
      <AccountBanner api={api} />

      <aside className="sidebar">
        <section>
          <h4>{t.filters}</h4>
          <div className="filters" role="radiogroup" aria-label={t.filters}>
            {(Object.keys(FILTER_CATEGORIES) as Filter[]).map((f) => (
              <button
                key={f}
                role="radio"
                aria-checked={filter === f}
                className={`filter ${filter === f ? 'active' : ''}`}
                style={{ ['--c' as string]: FILTER_COLORS[f] }}
                onClick={() => {
                  setFilter(f);
                  setPath(null);
                }}
                data-testid={`filter-${f}`}
              >
                <span className="dot" />
                {f === 'ALL' ? t.all : t[f]}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h4>{t.layout}</h4>
          <div className="segmented">
            <button className={layout === 'network' ? 'active' : ''} onClick={() => setLayout('network')} data-testid="layout-network">
              {t.layoutNetwork}
            </button>
            <button className={layout === 'generations' ? 'active' : ''} onClick={() => setLayout('generations')} data-testid="layout-generations">
              {t.layoutGenerations}
            </button>
          </div>
          <label className="inline">
            {t.depth}
            <input type="range" min={1} max={4} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
            <span className="gold-text">{depth}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> {t.labels}
          </label>
          <div className="gen-nav">
            <button className="btn small" onClick={() => stepGen(-1)} aria-label={t.generationUp} data-testid="gen-up">
              ▲ {t.generationUp}
            </button>
            <button className="btn small" onClick={() => stepGen(1)} aria-label={t.generationDown} data-testid="gen-down">
              ▼ {t.generationDown}
            </button>
          </div>
        </section>
        <Legend />
        <section className="stats">
          <div>
            <strong>{stats.people}</strong> {t.people}
          </div>
          <div>
            <strong>{stats.connections}</strong> {t.connections}
          </div>
        </section>
      </aside>

      <main className="stage">
        <GraphCanvas
          ref={canvas}
          nodes={nodeList}
          edges={edgeList}
          focusId={focusId}
          layout={layout}
          showLabels={showLabels}
          rtl={dir === 'rtl'}
          youLabel={t.you}
          selectedId={selected}
          highlight={highlight}
          onSelectNode={(id) => {
            setSelected(id);
            setSelectedEdge(null);
            if (id) setTab('person');
          }}
          onSelectEdge={(id) => {
            const e = edges.get(id);
            if (!e) return;
            setSelected(e.source);
            setSelectedEdge(id);
            setTab('person');
          }}
          onExpand={(id) => (expansions.has(id) ? collapse(id) : expand(id))}
        />
        <div className="stage-tools">
          {focusId !== session.profileId && (
            <button className="btn small gold" onClick={() => setFocusId(session.profileId)} data-testid="btn-me">
              ⌂ {t.myView}
            </button>
          )}
          <button className="btn small" onClick={() => canvas.current?.fit()}>
            ⤢ {t.fit}
          </button>
          {path && (
            <button className="btn small" onClick={() => setPath(null)}>
              × {t.howConnected}
            </button>
          )}
        </div>
        {loading && <div className="stage-overlay">{t.loading}</div>}
        {error && (
          <div className="stage-overlay error" role="alert">
            {error}
          </div>
        )}
      </main>

      <aside className="rightbar">
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'person'} className={tab === 'person' ? 'active' : ''} onClick={() => setTab('person')}>
            {t.profile}
          </button>
          <button role="tab" aria-selected={tab === 'connect'} className={tab === 'connect' ? 'active' : ''} onClick={() => setTab('connect')} data-testid="tab-connect">
            {t.howConnected}
          </button>
          <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')} data-testid="tab-inbox">
            {t.inbox} {inboxCount > 0 && <span className="count">{inboxCount}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'identity'} className={tab === 'identity' ? 'active' : ''} onClick={() => setTab('identity')} data-testid="tab-identity">
            {t.myIdentity}
          </button>
        </nav>
        {tab === 'person' &&
          (selectedNode ? (
            <PersonPanel
              api={api}
              node={selectedNode}
              edges={edgeList}
              nodes={nodes}
              isFocus={selectedNode.id === focusId}
              expanded={expansions.has(selectedNode.id)}
              selectedEdgeId={selectedEdge}
              onFocus={() => setFocusId(selectedNode.id)}
              onExpand={() => expand(selectedNode.id)}
              onCollapse={() => collapse(selectedNode.id)}
              onConnectFrom={() => {
                setPathFrom(me);
                setPathTo(selectedNode);
                setTab('connect');
              }}
              onSelectEdge={setSelectedEdge}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          ) : (
            <div className="panel empty muted">{t.pickFromGraph}</div>
          ))}
        {tab === 'connect' && (
          <ConnectPanel api={api} from={pathFrom} to={pathTo} setFrom={setPathFrom} setTo={setPathTo} known={nodeList} onResult={setPath} />
        )}
        {tab === 'inbox' && <InboxPanel api={api} onChanged={() => setRefreshKey((k) => k + 1)} onCount={setInboxCount} />}
        {tab === 'identity' && <IdentityPanel api={api} profileId={session.profileId} onChanged={() => setRefreshKey((k) => k + 1)} />}
      </aside>

      {adding && (
        <AddRelationshipDialog
          api={api}
          me={me}
          known={nodeList}
          initialPerson={selectedNode}
          onClose={() => setAdding(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
