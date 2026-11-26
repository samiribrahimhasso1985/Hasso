import { getType } from './catalog';
import { effectiveCategory, type GraphIndex } from './graph';
import { confirmersOf } from './verification';
import type { PersonNode, RelationshipEdge, RelationshipVisibility } from './types';

/**
 * Who is looking. Built once per request from the viewer's own neighbourhood.
 */
export interface ViewerContext {
  userId: string | null;
  personId: string | null;
  /** People the viewer blocked or who blocked the viewer. Blocking hides in both directions. */
  blockedPersonIds: ReadonlySet<string>;
  /** People directly connected to the viewer by a confirmed edge (any category). */
  networkPersonIds: ReadonlySet<string>;
  /** People connected to the viewer through confirmed family/union edges (bounded depth). */
  familyPersonIds: ReadonlySet<string>;
}

const RANK: Record<RelationshipVisibility, number> = { PUBLIC: 0, NETWORK: 1, FAMILY: 2, PRIVATE: 3 };

/** Edges touching a protected minor never exceed FAMILY visibility. */
export function effectiveVisibility(edge: RelationshipEdge, from: PersonNode, to: PersonNode): RelationshipVisibility {
  const v = edge.visibility;
  if ((from.isMinor || to.isMinor) && RANK[v] < RANK.FAMILY) return 'FAMILY';
  return v;
}

export function isPartyTo(ctx: ViewerContext, from: PersonNode, to: PersonNode): boolean {
  if (!ctx.userId) return false;
  return confirmersOf(from).includes(ctx.userId) || confirmersOf(to).includes(ctx.userId);
}

export function canViewEdge(ctx: ViewerContext, edge: RelationshipEdge, from: PersonNode, to: PersonNode): boolean {
  if (edge.status === 'REJECTED') return isPartyTo(ctx, from, to);
  if (ctx.blockedPersonIds.has(from.id) || ctx.blockedPersonIds.has(to.id)) return false;
  if (isPartyTo(ctx, from, to)) return true;
  // Unconfirmed claims are only visible to the people who must decide on them.
  if (edge.status !== 'CONFIRMED') return false;
  const touches = (s: ReadonlySet<string>) => s.has(from.id) || s.has(to.id);
  const isViewer = ctx.personId !== null && (from.id === ctx.personId || to.id === ctx.personId);
  switch (effectiveVisibility(edge, from, to)) {
    case 'PUBLIC':
      return true;
    case 'NETWORK':
      return isViewer || touches(ctx.networkPersonIds) || touches(ctx.familyPersonIds);
    case 'FAMILY':
      return isViewer || touches(ctx.familyPersonIds);
    case 'PRIVATE':
      return false;
  }
}

/** Builds a viewer context from an index that contains the viewer's neighbourhood. */
export function buildViewerContext(
  index: GraphIndex,
  viewer: { userId: string | null; personId: string | null },
  blockedPersonIds: Iterable<string> = [],
  familyDepth = 4,
): ViewerContext {
  const network = new Set<string>();
  const family = new Set<string>();
  if (viewer.personId && index.person(viewer.personId)) {
    for (const e of index.edgesOf(viewer.personId, (x) => x.status === 'CONFIRMED')) {
      network.add(e.fromId === viewer.personId ? e.toId : e.fromId);
    }
    family.add(viewer.personId);
    let front = [viewer.personId];
    for (let d = 0; d < familyDepth && front.length; d++) {
      const next: string[] = [];
      for (const id of front) {
        for (const e of index.edgesOf(id, (x) => x.status === 'CONFIRMED')) {
          const c = effectiveCategory(e);
          if (c !== 'FAMILY' && c !== 'UNION') continue;
          const o = e.fromId === id ? e.toId : e.fromId;
          if (!family.has(o)) {
            family.add(o);
            next.push(o);
          }
        }
      }
      front = next;
    }
  }
  return {
    userId: viewer.userId,
    personId: viewer.personId,
    blockedPersonIds: new Set(blockedPersonIds),
    networkPersonIds: network,
    familyPersonIds: family,
  };
}

/** Default visibility for a new edge of this type. */
export function defaultVisibility(typeKey: string): RelationshipVisibility {
  return getType(typeKey).defaultVisibility;
}
