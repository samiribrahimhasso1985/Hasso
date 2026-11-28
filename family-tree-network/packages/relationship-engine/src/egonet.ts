import { effectiveCategory, otherEnd, type GraphIndex } from './graph';
import { generations } from './kinship';
import type { RelationshipCategory, RelationshipEdge } from './types';

export interface EgoOptions {
  depth?: number; // hops from the centre (default 2)
  categories?: RelationshipCategory[];
  includePending?: boolean;
  edgeFilter?: (e: RelationshipEdge) => boolean;
  /** Hard cap on returned nodes for progressive loading (default 300). */
  maxNodes?: number;
}

export interface EgoNode {
  id: string;
  depth: number;
  /** Generation relative to centre (−1 parents, +1 children); null if not family-connected. */
  generation: number | null;
  /** Usable edges to people not included → the UI shows an "expand" affordance. */
  hiddenNeighbours: number;
}

export interface EgoNetwork {
  centerId: string;
  nodes: EgoNode[];
  edges: RelationshipEdge[];
  truncated: boolean;
}

/**
 * Ego network around one person: the unit of progressive loading.
 * The UI starts from the viewer, then "expands" any node by requesting
 * that node's ego network and merging it in.
 */
export function egoNetwork(index: GraphIndex, centerId: string, opts: EgoOptions = {}): EgoNetwork {
  const depth = opts.depth ?? 2;
  const maxNodes = opts.maxNodes ?? 300;
  const cats = opts.categories ? new Set(opts.categories) : null;
  const usable = (e: RelationshipEdge) =>
    e.status !== 'REJECTED' &&
    (e.status === 'CONFIRMED' || Boolean(opts.includePending)) &&
    (!cats || cats.has(effectiveCategory(e))) &&
    (!opts.edgeFilter || opts.edgeFilter(e));

  const depthOf = new Map<string, number>([[centerId, 0]]);
  let front = [centerId];
  let truncated = false;
  for (let d = 0; d < depth && front.length; d++) {
    const next: string[] = [];
    for (const id of front) {
      for (const e of index.edgesOf(id, usable)) {
        const o = otherEnd(e, id);
        if (depthOf.has(o)) continue;
        if (depthOf.size >= maxNodes) {
          truncated = true;
          continue;
        }
        depthOf.set(o, d + 1);
        next.push(o);
      }
    }
    front = next;
  }

  const edges: RelationshipEdge[] = [];
  const seen = new Set<string>();
  const hidden = new Map<string, number>();
  for (const id of depthOf.keys()) {
    for (const e of index.edgesOf(id, usable)) {
      const o = otherEnd(e, id);
      if (depthOf.has(o)) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          edges.push(e);
        }
      } else {
        hidden.set(id, (hidden.get(id) ?? 0) + 1);
      }
    }
  }

  // generations are computed over the same (visibility-filtered) edges only — no leaks
  const gen = generations(index, centerId, 8, usable);
  const nodes: EgoNode[] = [...depthOf.entries()].map(([id, d]) => ({
    id,
    depth: d,
    generation: gen.has(id) ? gen.get(id)! : null,
    hiddenNeighbours: hidden.get(id) ?? 0,
  }));
  return { centerId, nodes, edges, truncated };
}
