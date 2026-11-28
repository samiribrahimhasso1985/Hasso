import { getType } from './catalog';
import type { PersonNode, RelationshipCategory, RelationshipEdge } from './types';

/** Category actually used for display/filtering (CUSTOM edges adopt their chosen category). */
export function effectiveCategory(edge: RelationshipEdge): RelationshipCategory {
  const t = getType(edge.typeKey);
  if (t.category === 'CUSTOM' && edge.attributes?.customCategory) return edge.attributes.customCategory;
  return t.category;
}

export function otherEnd(edge: RelationshipEdge, personId: string): string {
  return edge.fromId === personId ? edge.toId : edge.fromId;
}

/**
 * In-memory adjacency index over a (sub)graph.
 * The API loads the relevant neighbourhood from PostgreSQL and builds one per request.
 */
export class GraphIndex {
  readonly people = new Map<string, PersonNode>();
  readonly edges = new Map<string, RelationshipEdge>();
  private readonly adjacency = new Map<string, Set<string>>(); // personId -> edgeIds

  constructor(people: Iterable<PersonNode> = [], edges: Iterable<RelationshipEdge> = []) {
    for (const p of people) this.addPerson(p);
    for (const e of edges) this.addEdge(e);
  }

  addPerson(p: PersonNode): void {
    this.people.set(p.id, p);
    if (!this.adjacency.has(p.id)) this.adjacency.set(p.id, new Set());
  }

  addEdge(e: RelationshipEdge): void {
    this.edges.set(e.id, e);
    for (const id of [e.fromId, e.toId]) {
      if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
      this.adjacency.get(id)!.add(e.id);
    }
  }

  removeEdge(edgeId: string): void {
    const e = this.edges.get(edgeId);
    if (!e) return;
    this.edges.delete(edgeId);
    this.adjacency.get(e.fromId)?.delete(edgeId);
    this.adjacency.get(e.toId)?.delete(edgeId);
  }

  person(id: string): PersonNode | undefined {
    return this.people.get(id);
  }

  edgesOf(personId: string, filter?: (e: RelationshipEdge) => boolean): RelationshipEdge[] {
    const ids = this.adjacency.get(personId);
    if (!ids) return [];
    const out: RelationshipEdge[] = [];
    for (const id of ids) {
      const e = this.edges.get(id)!;
      if (!filter || filter(e)) out.push(e);
    }
    // deterministic order → deterministic algorithms and tests
    return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  /** Edges between two specific people. */
  edgesBetween(a: string, b: string): RelationshipEdge[] {
    return this.edgesOf(a, (e) => otherEnd(e, a) === b);
  }

  /** Confirmed parents of a person (PARENT edges where person is the child). */
  parentsOf(personId: string, onlyConfirmed = true): RelationshipEdge[] {
    return this.edgesOf(
      personId,
      (e) => e.typeKey === 'PARENT' && e.toId === personId && (!onlyConfirmed || e.status === 'CONFIRMED'),
    );
  }

  childrenOf(personId: string, onlyConfirmed = true): RelationshipEdge[] {
    return this.edgesOf(
      personId,
      (e) => e.typeKey === 'PARENT' && e.fromId === personId && (!onlyConfirmed || e.status === 'CONFIRMED'),
    );
  }

  /** True if `ancestorId` is reachable by walking PARENT edges upwards from `personId`. */
  isAncestor(ancestorId: string, personId: string, includePending = true): boolean {
    const seen = new Set<string>();
    const stack = [personId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of this.parentsOf(cur, false)) {
        if (!includePending && e.status !== 'CONFIRMED') continue;
        if (e.status === 'REJECTED') continue;
        if (e.fromId === ancestorId) return true;
        if (!seen.has(e.fromId)) {
          seen.add(e.fromId);
          stack.push(e.fromId);
        }
      }
    }
    return false;
  }
}
