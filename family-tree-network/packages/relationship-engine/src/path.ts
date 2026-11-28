import type { GraphIndex } from './graph';
import { effectiveCategory, otherEnd } from './graph';
import type { RelationshipCategory, RelationshipEdge, VerificationStatus } from './types';

export interface PathStep {
  edgeId: string;
  typeKey: string;
  category: RelationshipCategory;
  status: VerificationStatus;
  /** The person we walk from at this step. */
  fromPersonId: string;
  /** The person we arrive at; "toPersonId is the <relation> of fromPersonId". */
  toPersonId: string;
}

export interface ConnectionPath {
  personIds: string[];
  steps: PathStep[];
  /** Every edge on the path is CONFIRMED. */
  fullyVerified: boolean;
}

export interface PathOptions {
  /** Restrict to these categories (default: all). */
  categories?: RelationshipCategory[];
  /** Include PENDING edges (they are flagged, never presented as verified). Default false. */
  includePending?: boolean;
  /** Extra predicate, e.g. viewer visibility. */
  edgeFilter?: (e: RelationshipEdge) => boolean;
  /** Maximum number of hops. Default 8. */
  maxHops?: number;
}

/**
 * "How Are We Connected?" — shortest path (fewest hops) between two people.
 *
 * By default only CONFIRMED edges are traversed, so the engine never presents an
 * unverified claim as a connection. Returns null when no path exists; callers
 * must then show "No verified connection found" instead of guessing.
 *
 * The API bounds the explored area by loading only the neighbourhoods of both
 * people from the database before calling this (see RELATIONSHIP_ENGINE.md). Ties are broken deterministically (sorted edge ids), and family/union
 * edges are preferred over other categories at equal length.
 */
export function findConnection(
  index: GraphIndex,
  sourceId: string,
  targetId: string,
  opts: PathOptions = {},
): ConnectionPath | null {
  if (!index.person(sourceId) || !index.person(targetId)) return null;
  if (sourceId === targetId) return { personIds: [sourceId], steps: [], fullyVerified: true };
  const maxHops = opts.maxHops ?? 8;
  const cats = opts.categories ? new Set(opts.categories) : null;
  const usable = (e: RelationshipEdge) =>
    (e.status === 'CONFIRMED' || (Boolean(opts.includePending) && e.status === 'PENDING')) &&
    (!cats || cats.has(effectiveCategory(e))) &&
    (!opts.edgeFilter || opts.edgeFilter(e));
  const rank = (e: RelationshipEdge) => {
    const c = effectiveCategory(e);
    return (e.status === 'CONFIRMED' ? 0 : 10) + (c === 'FAMILY' || c === 'UNION' ? 0 : 1);
  };
  const neighbours = (id: string) =>
    index.edgesOf(id, usable).sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));

  // Breadth-first search from the source; parent pointers: node -> [prevNode, edge]
  const prev = new Map<string, [string, RelationshipEdge] | null>([[sourceId, null]]);
  let front = [sourceId];
  let hops = 0;
  let found = false;
  while (front.length && hops < maxHops && !found) {
    const next: string[] = [];
    for (const id of front) {
      for (const e of neighbours(id)) {
        const n = otherEnd(e, id);
        if (prev.has(n)) continue;
        prev.set(n, [id, e]);
        if (n === targetId) {
          found = true;
          break;
        }
        next.push(n);
      }
      if (found) break;
    }
    front = next;
    hops++;
  }
  if (!found) return null;

  const personIds: string[] = [];
  const edges: RelationshipEdge[] = [];
  for (let cur: string | undefined = targetId; cur !== undefined; ) {
    personIds.unshift(cur);
    const p = prev.get(cur);
    if (p) edges.unshift(p[1]);
    cur = p?.[0];
  }
  const steps: PathStep[] = edges.map((e, i) => ({
    edgeId: e.id,
    typeKey: e.typeKey,
    category: effectiveCategory(e),
    status: e.status,
    fromPersonId: personIds[i],
    toPersonId: personIds[i + 1],
  }));
  return { personIds, steps, fullyVerified: steps.every((s) => s.status === 'CONFIRMED') };
}
