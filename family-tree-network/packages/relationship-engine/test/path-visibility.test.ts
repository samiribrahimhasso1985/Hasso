import { describe, expect, it } from 'vitest';
import {
  GraphIndex,
  buildViewerContext,
  canViewEdge,
  egoNetwork,
  findConnection,
  notificationTier,
  type RelationshipEdge,
} from '../src';
import { demoNetwork, person, rel } from './fixtures';

describe('How Are We Connected? (findConnection)', () => {
  const g = demoNetwork();

  it('finds the shortest verified path with intermediate people', () => {
    const p = findConnection(g, 'karim', 'peter')!;
    expect(p.personIds).toEqual(['karim', 'mahmoud', 'ibrahim', 'khaled', 'omar', 'anna', 'peter']);
    expect(p.steps.map((s) => s.typeKey)).toEqual(['PARENT', 'PARENT', 'PARENT', 'PARENT', 'SPOUSE', 'PARENT']);
    expect(p.fullyVerified).toBe(true);
  });

  it('connects family and social circles in one network', () => {
    const p = findConnection(g, 'sara', 'julia')!;
    // Sara and Omar are siblings through their shared parents (no separate sibling record needed):
    // Sara → parent → Omar (son) → Julia (colleague)
    expect(p.personIds[0]).toBe('sara');
    expect(p.personIds.slice(2)).toEqual(['omar', 'julia']);
    expect(p.steps.map((s) => s.category)).toEqual(['FAMILY', 'FAMILY', 'PROFESSIONAL']);
  });

  it('returns null when no verified connection exists — never invents one', () => {
    const h = new GraphIndex([person('a', 'MALE'), person('b', 'MALE'), person('c', 'MALE')]);
    rel(h, 'a', 'FRIEND', 'b');
    rel(h, 'b', 'FRIEND', 'c', { status: 'PENDING' });
    expect(findConnection(h, 'a', 'c')).toBeNull();
    const withPending = findConnection(h, 'a', 'c', { includePending: true })!;
    expect(withPending.fullyVerified).toBe(false);
    expect(withPending.steps[1].status).toBe('PENDING');
  });

  it('respects category filters', () => {
    expect(findConnection(g, 'sara', 'julia', { categories: ['FAMILY', 'UNION'] })).toBeNull();
    expect(findConnection(g, 'omar', 'daniel', { categories: ['FRIENDSHIP'] })!.steps).toHaveLength(1);
  });

  it('prefers family/union routes at equal length', () => {
    // Anna ↔ Omar is both spouse (UNION) and, via Julia, 2 hops away — the direct union wins anyway;
    // here: Omar → Julia → Anna (2 hops social) vs Omar → Adam → Anna (2 hops family).
    const h = demoNetwork();
    h.removeEdge(h.edgesBetween('omar', 'anna')[0].id);
    const p = findConnection(h, 'omar', 'anna')!;
    expect(p.steps.every((s) => s.category === 'FAMILY')).toBe(true);
  });

  it('scales to a large graph', () => {
    const n = 20000;
    const people = Array.from({ length: n }, (_, i) => person(`p${i}`, 'UNSPECIFIED'));
    const h = new GraphIndex(people);
    let id = 0;
    for (let i = 1; i < n; i++) {
      const j = Math.floor((i * 7919) % i); // deterministic pseudo-random earlier node
      const e: RelationshipEdge = {
        id: `x${id++}`, typeKey: 'FRIEND', fromId: `p${j}`, toId: `p${i}`, status: 'CONFIRMED', visibility: 'PUBLIC', createdByUserId: 'u',
      };
      h.addEdge(e);
    }
    const t0 = performance.now();
    const p = findConnection(h, 'p19999', 'p12345', { maxHops: 40 });
    const ms = performance.now() - t0;
    expect(p).not.toBeNull();
    expect(ms).toBeLessThan(2000);
  });
});

describe('visibility', () => {
  const g = demoNetwork();
  const edge = (a: string, b: string) => g.edgesBetween(a, b)[0];
  const ctx = (personId: string | null, blocked: string[] = []) =>
    buildViewerContext(g, { userId: personId ? `u_${personId}` : null, personId }, blocked);

  it('family-visibility edges are visible to family, hidden from strangers', () => {
    const e = edge('omar', 'khaled');
    const [a, b] = [g.person(e.fromId)!, g.person(e.toId)!];
    expect(canViewEdge(ctx('karim'), e, a, b)).toBe(true);
    expect(canViewEdge(ctx('julia'), e, a, b)).toBe(false);
    expect(canViewEdge(ctx(null), e, a, b)).toBe(false);
  });

  it('network-visibility edges are visible to direct connections', () => {
    const e = edge('omar', 'daniel');
    const [a, b] = [g.person(e.fromId)!, g.person(e.toId)!];
    expect(canViewEdge(ctx('julia'), e, a, b)).toBe(true);
    expect(canViewEdge(ctx(null), e, a, b)).toBe(false);
  });

  it('edges of protected minors are never public', () => {
    const e = { ...edge('omar', 'adam'), visibility: 'PUBLIC' as const };
    const [a, b] = [g.person(e.fromId)!, g.person(e.toId)!];
    expect(canViewEdge(ctx(null), e, a, b)).toBe(false);
    expect(canViewEdge(ctx('julia'), e, a, b)).toBe(false);
    expect(canViewEdge(ctx('sara'), e, a, b)).toBe(true);
  });

  it('pending claims are only visible to the people who must decide', () => {
    const h = new GraphIndex([person('a', 'MALE'), person('b', 'FEMALE'), person('c', 'MALE')]);
    rel(h, 'a', 'FRIEND', 'c');
    const e = rel(h, 'a', 'SISTER', 'b', { status: 'PENDING', visibility: 'PUBLIC' });
    const c = (id: string) => buildViewerContext(h, { userId: `u_${id}`, personId: id });
    expect(canViewEdge(c('b'), e, h.person(e.fromId)!, h.person(e.toId)!)).toBe(true);
    expect(canViewEdge(c('c'), e, h.person(e.fromId)!, h.person(e.toId)!)).toBe(false);
  });

  it('blocking hides relationships in both directions', () => {
    const e = edge('omar', 'daniel');
    const [a, b] = [g.person(e.fromId)!, g.person(e.toId)!];
    expect(canViewEdge(ctx('julia', ['daniel']), e, a, b)).toBe(false);
  });
});

describe('egoNetwork (progressive loading)', () => {
  const g = demoNetwork();

  it('returns the first ring with expand hints', () => {
    const ego = egoNetwork(g, 'omar', { depth: 1 });
    const ids = ego.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(
      ['adam', 'anna', 'daniel', 'elif', 'hassan', 'julia', 'khaled', 'layla', 'lina', 'markus', 'mila', 'omar', 'thomas', 'zaid'].sort(),
    );
    const khaled = ego.nodes.find((n) => n.id === 'khaled')!;
    expect(khaled.generation).toBe(-1);
    expect(khaled.hiddenNeighbours).toBeGreaterThan(0); // Ibrahim, Sara … can be expanded
    expect(ego.nodes.find((n) => n.id === 'julia')!.generation).toBeNull();
  });

  it('filters by category', () => {
    const ego = egoNetwork(g, 'omar', { depth: 1, categories: ['FRIENDSHIP'] });
    expect(ego.nodes.map((n) => n.id).sort()).toEqual(['daniel', 'hassan', 'omar']);
  });

  it('caps the number of nodes', () => {
    const ego = egoNetwork(g, 'omar', { depth: 4, maxNodes: 5 });
    expect(ego.nodes).toHaveLength(5);
    expect(ego.truncated).toBe(true);
  });
});

describe('notification tiers', () => {
  const g = demoNetwork();
  it('prioritises close family, then extended family, then friends and colleagues', () => {
    expect(notificationTier(g, 'omar', 'khaled')).toBe(1);
    expect(notificationTier(g, 'omar', 'anna')).toBe(1);
    expect(notificationTier(g, 'omar', 'zaid')).toBe(1);
    expect(notificationTier(g, 'omar', 'ibrahim')).toBe(2);
    expect(notificationTier(g, 'omar', 'karim')).toBe(2);
    expect(notificationTier(g, 'omar', 'peter')).toBe(2);
    expect(notificationTier(g, 'omar', 'daniel')).toBe(3);
    expect(notificationTier(g, 'omar', 'julia')).toBe(3);
    expect(notificationTier(g, 'omar', 'markus')).toBeNull();
    expect(notificationTier(g, 'omar', 'lina')).toBeNull(); // former spouse: no automatic notifications
  });
});
