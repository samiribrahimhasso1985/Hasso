import { Injectable } from '@nestjs/common';
import { Prisma, Profile, ProfileSteward, Relationship } from '@prisma/client';
import {
  GraphIndex,
  RELATIONSHIP_TYPES,
  buildViewerContext,
  canViewEdge,
  type EdgeAttributes,
  type PersonNode,
  type RelationshipEdge,
  type ViewerContext,
} from '@ftn/relationship-engine';
import { Db, PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/auth-user';

const FAMILY_TYPE_KEYS = RELATIONSHIP_TYPES.filter((t) => t.category === 'FAMILY' || t.category === 'UNION').map((t) => t.key);

type ProfileWithStewards = Profile & { stewards: ProfileSteward[] };

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export function toPersonNode(p: ProfileWithStewards): PersonNode {
  return {
    id: p.id,
    displayName: p.displayName,
    gender: p.gender,
    birthDate: day(p.birthDate),
    deathDate: day(p.deathDate),
    userId: p.userId,
    stewardUserIds: p.stewards.map((s) => s.userId),
    isMinor: p.isMinor,
  };
}

export function toEdge(r: Relationship): RelationshipEdge {
  return {
    id: r.id,
    typeKey: r.typeKey,
    fromId: r.fromProfileId,
    toId: r.toProfileId,
    status: r.status,
    visibility: r.visibility,
    createdByUserId: r.createdById,
    createdAt: r.createdAt.toISOString(),
    attributes: {
      parentSubtype: r.parentSubtype ?? undefined,
      siblingSubtype: r.siblingSubtype ?? undefined,
      lineageSide: r.lineageSide ?? undefined,
      startDate: day(r.startDate),
      endDate: day(r.endDate),
      endReason: r.endReason,
      customLabel: r.customLabel,
      customCategory: (r.customCategory as EdgeAttributes['customCategory']) ?? null,
      note: r.note,
    },
  };
}

export interface Loaded {
  index: GraphIndex;
  profiles: Map<string, ProfileWithStewards>;
}

/**
 * Loads bounded sub-graphs from PostgreSQL into an engine GraphIndex.
 *
 * The full graph is never loaded: every request loads only the neighbourhoods it
 * needs, level by level, with one indexed query per level
 * (relationships_from_profile_id_status_idx / relationships_to_profile_id_status_idx).
 */
@Injectable()
export class GraphLoader {
  constructor(private readonly prisma: PrismaService) {}

  /** Breadth-first neighbourhood: edges incident to every node at depth < `depth`. */
  async neighbourhood(
    seeds: string[],
    depth: number,
    opts: { db?: Db; familyOnly?: boolean; maxNodes?: number; into?: Loaded } = {},
  ): Promise<Loaded> {
    const db = opts.db ?? this.prisma;
    const maxNodes = opts.maxNodes ?? 2000;
    const loaded = opts.into ?? { index: new GraphIndex(), profiles: new Map() };
    const seen = new Set<string>(seeds);
    let frontier = [...seeds];
    const edges: Relationship[] = [];
    for (let d = 0; d < depth && frontier.length; d++) {
      const rows = await db.relationship.findMany({
        where: {
          status: { not: 'REJECTED' },
          ...(opts.familyOnly ? { typeKey: { in: FAMILY_TYPE_KEYS } } : {}),
          OR: [{ fromProfileId: { in: frontier } }, { toProfileId: { in: frontier } }],
        },
      });
      const next: string[] = [];
      for (const r of rows) {
        edges.push(r);
        for (const id of [r.fromProfileId, r.toProfileId]) {
          if (!seen.has(id) && seen.size < maxNodes) {
            seen.add(id);
            next.push(id);
          }
        }
      }
      frontier = next;
    }
    await this.addProfiles(loaded, [...seen, ...edges.flatMap((e) => [e.fromProfileId, e.toProfileId])], db);
    for (const e of edges) loaded.index.addEdge(toEdge(e));
    return loaded;
  }

  /** All ancestors (PARENT/GRANDPARENT chains, any depth) of the given people, incl. the edges. */
  async ancestry(ids: string[], into: Loaded, db: Db = this.prisma): Promise<void> {
    if (!ids.length) return;
    const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE anc(id, depth) AS (
        SELECT unnest(${ids}::uuid[]), 0
        UNION
        SELECT r.from_profile_id, a.depth + 1
          FROM relationships r JOIN anc a ON r.to_profile_id = a.id
         WHERE r.type_key IN ('PARENT', 'GRANDPARENT') AND r.status <> 'REJECTED' AND a.depth < 60
      )
      SELECT DISTINCT id::text AS id FROM anc`);
    const ancIds = rows.map((r) => r.id);
    const edges = await db.relationship.findMany({
      where: { typeKey: { in: ['PARENT', 'GRANDPARENT'] }, status: { not: 'REJECTED' }, toProfileId: { in: ancIds } },
    });
    await this.addProfiles(into, [...ancIds, ...edges.map((e) => e.fromProfileId)], db);
    for (const e of edges) into.index.addEdge(toEdge(e));
  }

  async addProfiles(into: Loaded, ids: string[], db: Db = this.prisma): Promise<void> {
    const missing = [...new Set(ids)].filter((id) => !into.profiles.has(id));
    if (!missing.length) return;
    const profiles = await db.profile.findMany({ where: { id: { in: missing } }, include: { stewards: true } });
    for (const p of profiles) {
      into.profiles.set(p.id, p);
      into.index.addPerson(toPersonNode(p));
    }
  }

  /** Profile ids hidden from this viewer because of blocks (either direction). */
  async blockedFor(user: AuthUser): Promise<string[]> {
    const [mine, theirs] = await Promise.all([
      this.prisma.block.findMany({ where: { blockerUserId: user.userId }, select: { blockedProfileId: true } }),
      this.prisma.block.findMany({
        where: { blockedProfileId: user.profileId },
        select: { blocker: { select: { profile: { select: { id: true } } } } },
      }),
    ]);
    return [
      ...mine.map((b) => b.blockedProfileId),
      ...theirs.map((b) => b.blocker.profile?.id).filter((x): x is string => Boolean(x)),
    ];
  }

  /**
   * Loads the viewer's own neighbourhood (direct ties + family up to 4 hops)
   * into `into` and returns the viewer context used by visibility rules.
   */
  async viewer(user: AuthUser, into: Loaded): Promise<ViewerContext> {
    await this.neighbourhood([user.profileId], 1, { into });
    await this.neighbourhood([user.profileId], 4, { into, familyOnly: true });
    return buildViewerContext(into.index, { userId: user.userId, personId: user.profileId }, await this.blockedFor(user));
  }

  /** A new index containing only the edges this viewer may see. */
  visibleIndex(loaded: Loaded, ctx: ViewerContext): GraphIndex {
    const visible = new GraphIndex(loaded.index.people.values());
    for (const e of loaded.index.edges.values()) {
      const a = loaded.index.person(e.fromId);
      const b = loaded.index.person(e.toId);
      if (a && b && canViewEdge(ctx, e, a, b)) visible.addEdge(e);
    }
    return visible;
  }
}
