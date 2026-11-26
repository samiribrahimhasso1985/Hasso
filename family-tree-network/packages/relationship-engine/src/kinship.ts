import { getType } from './catalog';
import type { GraphIndex } from './graph';
import { isEndedUnion } from './normalize';
import type { Gender, LineageSide, ParentSubtype, RelationshipEdge } from './types';

/**
 * Kinship derivation.
 *
 * Only primitive facts are stored (parent, sibling, union, optionally declared
 * extended relations). Everything else — grandparents, uncles, cousins,
 * in-laws — is *derived* here from CONFIRMED edges only. A derived relation is
 * therefore never more certain than the weakest stored fact it is built on.
 *
 * Model: walking from person X to person Y over family edges, every edge is a
 * "move" of (up, down) generations. A blood relationship is a walk that goes
 * only up first and then only down (never down-then-up, which would pass
 * through a co-parent instead of a common ancestor).
 * The minimal (up, down) pair classifies the relation:
 *   (1,0) parent · (0,1) child · (1,1) sibling · (2,0) grandparent
 *   (2,1) uncle/aunt · (1,2) nephew/niece · (2,2) first cousin · …
 */

export type KinshipKey =
  | 'SELF'
  | 'PARENT'
  | 'CHILD'
  | 'SIBLING'
  | 'GRANDPARENT'
  | 'GRANDCHILD'
  | 'UNCLE_AUNT'
  | 'NEPHEW_NIECE'
  | 'COUSIN'
  | 'SPOUSE'
  | 'FORMER_SPOUSE'
  | 'PARTNER'
  | 'FIANCE'
  | 'STEP_PARENT'
  | 'STEP_CHILD'
  | 'PARENT_IN_LAW'
  | 'CHILD_IN_LAW'
  | 'SIBLING_IN_LAW'
  | 'RELATIVE_BY_MARRIAGE'
  | 'NONE';

export interface Kinship {
  key: KinshipKey;
  kind: 'SELF' | 'BLOOD' | 'UNION' | 'IN_LAW' | 'NONE';
  up: number;
  down: number;
  /** "great-" count for grandparents/uncles/nephews/grandchildren. */
  greats: number;
  /** For cousins: 1 = first cousin, 2 = second cousin … */
  cousinDegree: number;
  removed: number;
  half: boolean;
  /** Paternal/maternal side (used by Arabic: عم vs خال). */
  lineageSide: LineageSide;
  /** Gender of the parent's sibling (uncle/aunt) on the path — for Arabic cousin terms. */
  uncleAuntGender: Gender;
  /** Gender of the sibling on the path — for Arabic nephew terms (ابن الأخ / ابن الأخت). */
  siblingGender: Gender;
  /** Non-biological parent link on the path (adoptive, step, foster, guardian). */
  qualifier: Exclude<ParentSubtype, 'BIOLOGICAL'> | null;
  /** Person ids along the path, from → to. */
  path: string[];
  edgeIds: string[];
}

interface Move {
  edge: RelationshipEdge;
  next: string;
  up: number;
  down: number;
}

const MAX_COST = 12;

function familyMoves(index: GraphIndex, personId: string): Move[] {
  const moves: Move[] = [];
  for (const e of index.edgesOf(personId, (x) => x.status === 'CONFIRMED')) {
    const def = getType(e.typeKey);
    if (!def.kinshipMove) continue;
    const { up, down } = def.kinshipMove;
    if (def.directionality === 'SYMMETRIC') {
      moves.push({ edge: e, next: e.fromId === personId ? e.toId : e.fromId, up, down });
    } else if (e.toId === personId) {
      moves.push({ edge: e, next: e.fromId, up, down }); // towards the "from" (older) side
    } else {
      moves.push({ edge: e, next: e.toId, up: down, down: up });
    }
  }
  return moves;
}

interface State {
  node: string;
  phase: 0 | 1; // 0 = still allowed to go up, 1 = only down
  up: number;
  down: number;
  path: string[];
  edges: RelationshipEdge[];
}

/** Minimal blood walk from `fromId` to `toId`, or null. */
export function bloodWalk(index: GraphIndex, fromId: string, toId: string): State | null {
  if (fromId === toId) return { node: fromId, phase: 0, up: 0, down: 0, path: [fromId], edges: [] };
  const best = new Map<string, number>();
  let frontier: State[] = [{ node: fromId, phase: 0, up: 0, down: 0, path: [fromId], edges: [] }];
  best.set(`${fromId}:0`, 0);
  let found: State | null = null as State | null;
  // Uniform-cost search (costs are small integers → process cost layers in order)
  while (frontier.length) {
    frontier.sort((a, b) => a.up + a.down - (b.up + b.down) || a.up - b.up);
    const cur = frontier.shift()!;
    const cost = cur.up + cur.down;
    if (cur.node === toId) {
      found = cur;
      break;
    }
    if (cost >= MAX_COST) continue;
    for (const m of familyMoves(index, cur.node)) {
      if (m.up > 0 && cur.phase === 1) continue;
      if (cur.path.includes(m.next)) continue;
      const phase: 0 | 1 = m.down > 0 ? 1 : cur.phase;
      const next: State = {
        node: m.next,
        phase,
        up: cur.up + m.up,
        down: cur.down + m.down,
        path: [...cur.path, m.next],
        edges: [...cur.edges, m.edge],
      };
      const key = `${m.next}:${phase}`;
      const nc = next.up + next.down;
      if (best.has(key) && best.get(key)! <= nc) continue;
      best.set(key, nc);
      frontier.push(next);
    }
  }
  return found;
}

function emptyKinship(key: KinshipKey, kind: Kinship['kind']): Kinship {
  return {
    key,
    kind,
    up: 0,
    down: 0,
    greats: 0,
    cousinDegree: 0,
    removed: 0,
    half: false,
    lineageSide: 'UNSPECIFIED',
    uncleAuntGender: 'UNSPECIFIED',
    siblingGender: 'UNSPECIFIED',
    qualifier: null,
    path: [],
    edgeIds: [],
  };
}

function classifyBlood(index: GraphIndex, walk: State): Kinship {
  const { up, down } = walk;
  let key: KinshipKey;
  let greats = 0;
  let cousinDegree = 0;
  let removed = 0;
  if (up === 0 && down === 0) key = 'SELF';
  else if (down === 0) {
    key = up === 1 ? 'PARENT' : 'GRANDPARENT';
    greats = Math.max(0, up - 2);
  } else if (up === 0) {
    key = down === 1 ? 'CHILD' : 'GRANDCHILD';
    greats = Math.max(0, down - 2);
  } else if (up === 1 && down === 1) key = 'SIBLING';
  else if (down === 1) {
    key = 'UNCLE_AUNT';
    greats = up - 2;
  } else if (up === 1) {
    key = 'NEPHEW_NIECE';
    greats = down - 2;
  } else {
    key = 'COUSIN';
    cousinDegree = Math.min(up, down) - 1;
    removed = Math.abs(up - down);
  }

  const k = emptyKinship(key, key === 'SELF' ? 'SELF' : 'BLOOD');
  Object.assign(k, { up, down, greats, cousinDegree, removed, path: walk.path, edgeIds: walk.edges.map((e) => e.id) });

  // Walk again to find landmark nodes (first parent, sibling, uncle/aunt) and qualifiers.
  let cu = 0;
  let cd = 0;
  walk.edges.forEach((e, i) => {
    const node = walk.path[i + 1];
    const m = familyMoves(index, walk.path[i]).find((x) => x.edge.id === e.id)!;
    const before = { cu, cd };
    cu += m.up;
    cd += m.down;
    const gender = index.person(node)?.gender ?? 'UNSPECIFIED';
    if (i === 0) {
      if (e.typeKey === 'PARENT' && m.up === 1) {
        k.lineageSide = gender === 'MALE' ? 'PATERNAL' : gender === 'FEMALE' ? 'MATERNAL' : 'UNSPECIFIED';
      } else if (e.attributes?.lineageSide) {
        k.lineageSide = e.attributes.lineageSide;
      }
    }
    if (before.cu <= 1 && before.cd === 0 && cu === 1 && cd === 1) k.siblingGender = gender;
    if (cu === 2 && cd === 1 && before.cd === 0) k.uncleAuntGender = gender;
    if (e.typeKey === 'PARENT') {
      const st = e.attributes?.parentSubtype ?? 'BIOLOGICAL';
      if (st !== 'BIOLOGICAL' && !k.qualifier) k.qualifier = st;
    }
    if (e.typeKey === 'SIBLING' && e.attributes?.siblingSubtype === 'HALF') k.half = true;
    if (e.typeKey === 'SIBLING' && e.attributes?.siblingSubtype === 'STEP' && !k.qualifier) k.qualifier = 'STEP';
  });

  // Half-siblings derived from parents: exactly one shared parent while either has another.
  if (key === 'SIBLING' && walk.edges.every((e) => e.typeKey === 'PARENT')) {
    const a = walk.path[0];
    const b = walk.path[walk.path.length - 1];
    const pa = new Set(index.parentsOf(a).map((e) => e.fromId));
    const pb = new Set(index.parentsOf(b).map((e) => e.fromId));
    const shared = [...pa].filter((p) => pb.has(p));
    if (shared.length === 1 && (pa.size > 1 || pb.size > 1)) k.half = true;
  }
  if (key === 'PARENT' && k.qualifier === 'STEP') {
    k.key = 'STEP_PARENT';
    k.qualifier = null;
  }
  if (key === 'CHILD' && k.qualifier === 'STEP') {
    k.key = 'STEP_CHILD';
    k.qualifier = null;
  }
  return k;
}

function unionEdges(index: GraphIndex, personId: string): RelationshipEdge[] {
  return index.edgesOf(personId, (e) => e.status === 'CONFIRMED' && Boolean(getType(e.typeKey).isUnion || e.typeKey === 'FIANCE'));
}

/** Derives how `toId` is related to `fromId` ("toId is the <result> of fromId"). */
export function deriveKinship(index: GraphIndex, fromId: string, toId: string): Kinship {
  if (fromId === toId) return { ...emptyKinship('SELF', 'SELF'), path: [fromId] };

  // 1. Direct union
  const direct = unionEdges(index, fromId).find((e) => e.fromId === toId || e.toId === toId);
  if (direct) {
    const key: KinshipKey =
      direct.typeKey === 'FIANCE'
        ? 'FIANCE'
        : isEndedUnion(direct.attributes) && direct.attributes?.endReason !== 'DEATH'
          ? 'FORMER_SPOUSE'
          : direct.typeKey === 'PARTNER'
            ? 'PARTNER'
            : 'SPOUSE';
    return { ...emptyKinship(key, 'UNION'), path: [fromId, toId], edgeIds: [direct.id] };
  }

  // 2. Blood
  const walk = bloodWalk(index, fromId, toId);
  if (walk) return classifyBlood(index, walk);

  // 3. In-law via exactly one union hop.
  //   a) to is the spouse of my blood relative R
  let bestInLaw: Kinship | null = null;
  const consider = (k: Kinship) => {
    if (!bestInLaw || k.path.length < bestInLaw.path.length) bestInLaw = k;
  };
  for (const u of unionEdges(index, toId)) {
    if (isEndedUnion(u.attributes)) continue;
    const r = u.fromId === toId ? u.toId : u.fromId;
    const w = bloodWalk(index, fromId, r);
    if (!w || (w.up === 0 && w.down === 0)) continue;
    const rel = classifyBlood(index, w);
    const key: KinshipKey =
      rel.key === 'PARENT'
        ? 'STEP_PARENT'
        : rel.key === 'CHILD'
          ? 'CHILD_IN_LAW'
          : rel.key === 'SIBLING'
            ? 'SIBLING_IN_LAW'
            : rel.key === 'UNCLE_AUNT'
              ? 'UNCLE_AUNT'
              : 'RELATIVE_BY_MARRIAGE';
    consider({
      ...rel,
      key,
      kind: 'IN_LAW',
      path: [...w.path, toId],
      edgeIds: [...w.edges.map((e) => e.id), u.id],
    });
  }
  //   b) to is a blood relative of my spouse S
  for (const u of unionEdges(index, fromId)) {
    if (isEndedUnion(u.attributes)) continue;
    const s = u.fromId === fromId ? u.toId : u.fromId;
    const w = bloodWalk(index, s, toId);
    if (!w || (w.up === 0 && w.down === 0)) continue;
    const rel = classifyBlood(index, w);
    const key: KinshipKey =
      rel.key === 'PARENT'
        ? 'PARENT_IN_LAW'
        : rel.key === 'CHILD'
          ? 'STEP_CHILD'
          : rel.key === 'SIBLING'
            ? 'SIBLING_IN_LAW'
            : 'RELATIVE_BY_MARRIAGE';
    consider({
      ...rel,
      key,
      kind: 'IN_LAW',
      path: [fromId, ...w.path],
      edgeIds: [u.id, ...w.edges.map((e) => e.id)],
    });
  }
  if (bestInLaw) return bestInLaw;

  return emptyKinship('NONE', 'NONE');
}

/**
 * Generation offset of every family-connected person relative to `centerId`
 * (parents −1, children +1, siblings/spouses 0). Used for the "generations" layout.
 * People only reachable through social/professional edges get no generation.
 */
export function generations(
  index: GraphIndex,
  centerId: string,
  maxDepth = 8,
  edgeFilter: (e: RelationshipEdge) => boolean = (x) => x.status !== 'REJECTED',
): Map<string, number> {
  const gen = new Map<string, number>([[centerId, 0]]);
  const queue: [string, number][] = [[centerId, 0]];
  while (queue.length) {
    const [id, depth] = queue.shift()!;
    if (depth >= maxDepth) continue;
    const g = gen.get(id)!;
    for (const e of index.edgesOf(id, edgeFilter)) {
      const def = getType(e.typeKey);
      let delta: number | null = null;
      const other = e.fromId === id ? e.toId : e.fromId;
      if (def.kinshipMove) {
        const { up, down } = def.kinshipMove;
        // walking towards "from" = up - down generations upwards
        const towardsFrom = down - up; // negative = older generation
        if (def.directionality === 'SYMMETRIC') delta = towardsFrom;
        else delta = e.toId === id ? towardsFrom : -towardsFrom;
      } else if (def.isUnion || def.key === 'FIANCE') {
        delta = 0;
      }
      if (delta === null || gen.has(other)) continue;
      gen.set(other, g + delta);
      queue.push([other, depth + 1]);
    }
  }
  return gen;
}
