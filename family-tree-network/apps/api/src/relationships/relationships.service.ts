import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, RelationshipVerification } from '@prisma/client';
import {
  GraphIndex,
  applyDecision,
  assertCanCreate,
  computeStatus,
  confirmersOf,
  creatorDecisions,
  defaultVisibility,
  getType,
  normalizeRelationship,
  pendingSides,
  sidesUserCanDecide,
  validateNewRelationship,
  type Locale,
  type PersonNode,
  type VerificationDecision,
} from '@ftn/relationship-engine';
import { AuditService } from '../audit/audit.service';
import { FRIEND_TYPES, assertFriendRequestAllowed } from '../connect/policy';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { GraphLoader, toEdge, toPersonNode, type Loaded } from '../graph/graph-loader.service';
import { edgeDto, personSummary } from '../graph/present';
import { Db, PrismaService } from '../prisma/prisma.service';
import type { CreateRelationshipDto, DecisionDto, UpdateRelationshipDto } from './dto';

const asDate = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);
const toDecision = (v: RelationshipVerification): VerificationDecision => ({
  side: v.side,
  userId: v.userId,
  decision: v.decision,
  at: v.createdAt.toISOString(),
});
const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'RELATIONSHIP_NOT_FOUND', 'Relationship not found');

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: GraphLoader,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Member profiles that decide for a person: the person, or their stewards. */
  private async deciderProfiles(person: PersonNode) {
    const users = confirmersOf(person);
    if (!users.length) return [];
    const rows = await this.prisma.profile.findMany({ where: { userId: { in: users } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /** A new request: everyone who must still decide is notified (friend requests in FRIENDS, others in RELATIONSHIPS). */
  private async notifyRequest(user: AuthUser, relId: string, from: PersonNode, to: PersonNode, typeKey: string) {
    const friend = FRIEND_TYPES.includes(typeKey);
    for (const side of [from, to]) {
      if (confirmersOf(side).includes(user.userId)) continue; // the creator's own side
      for (const recipient of await this.deciderProfiles(side)) {
        await this.notifications.notify({
          recipientProfileId: recipient,
          actorProfileId: user.profileId,
          category: friend ? 'FRIENDS' : 'RELATIONSHIPS',
          type: friend ? 'FRIEND_REQUEST' : 'RELATIONSHIP_REQUEST',
          entityType: 'relationship',
          entityId: relId,
          data: { typeKey, subjectProfileId: side.id },
          dedupeKey: `rel:${relId}`,
        });
      }
    }
  }

  /** Serialises concurrent writes that touch the same people (duplicate / parent-count races). */
  private async lockPeople(db: Db, ids: string[]) {
    for (const id of [...new Set(ids)].sort()) {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    }
  }

  private async person(db: Db, id: string): Promise<PersonNode> {
    const p = await db.profile.findUnique({ where: { id }, include: { stewards: true } });
    if (!p) throw new AppError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found');
    return toPersonNode(p);
  }

  async create(user: AuthUser, dto: CreateRelationshipDto, locale: Locale) {
    const n = normalizeRelationship({
      personId: dto.personId,
      relatedPersonId: dto.relatedPersonId,
      type: dto.type,
      attributes: { ...(dto.attributes ?? {}) },
    });
    const type = await this.prisma.relationshipType.findUnique({ where: { key: n.typeKey } });
    if (!type?.enabled) throw new AppError(HttpStatus.BAD_REQUEST, 'TYPE_DISABLED', 'This relationship type is not available');

    const blocked = await this.loader.blockedFor(user);
    if (blocked.includes(n.fromId) || blocked.includes(n.toId)) {
      throw new AppError(HttpStatus.FORBIDDEN, 'BLOCKED', 'You cannot create relationships with this person');
    }

    const id = await this.prisma.$transaction(
      async (tx) => {
        await this.lockPeople(tx, [n.fromId, n.toId]);
        const from = await this.person(tx, n.fromId);
        const to = await this.person(tx, n.toId);
        assertCanCreate(from, to, user.userId);
        // A friendship with another member respects that member's CONNECT setting (also for the QR flow).
        if (FRIEND_TYPES.includes(n.typeKey)) {
          const other = confirmersOf(from).includes(user.userId) ? to : from;
          if (other.userId && other.userId !== user.userId) {
            const mine = confirmersOf(from).includes(user.userId) ? from : to;
            await assertFriendRequestAllowed(tx, mine.id, other.id);
          }
        }

        // Validation context: both people, their direct ties and full ancestry.
        const loaded: Loaded = { index: new GraphIndex(), profiles: new Map() };
        await this.loader.neighbourhood([n.fromId, n.toId], 1, { db: tx, into: loaded });
        await this.loader.ancestry([n.fromId, n.toId], loaded, tx);
        const violations = validateNewRelationship(loaded.index, n);
        if (violations.length) {
          throw new AppError(HttpStatus.CONFLICT, 'VALIDATION_FAILED', violations[0].message, { violations });
        }

        const at = new Date();
        const decisions = creatorDecisions(from, to, user.userId, at.toISOString());
        const status = computeStatus({ typeKey: n.typeKey }, from, to, decisions);
        const a = n.attributes;
        const rel = await tx.relationship.create({
          data: {
            typeKey: n.typeKey,
            fromProfileId: n.fromId,
            toProfileId: n.toId,
            status,
            visibility: dto.visibility ?? defaultVisibility(n.typeKey),
            createdById: user.userId,
            parentSubtype: a.parentSubtype,
            siblingSubtype: a.siblingSubtype,
            lineageSide: a.lineageSide,
            startDate: asDate(a.startDate),
            endDate: asDate(a.endDate),
            endReason: a.endReason ?? undefined,
            customLabel: a.customLabel ?? undefined,
            customCategory: a.customCategory ?? undefined,
            note: a.note ?? undefined,
          },
        });
        if (decisions.length) {
          await tx.relationshipVerification.createMany({
            data: decisions.map((d) => ({ relationshipId: rel.id, side: d.side, userId: d.userId, decision: d.decision, createdAt: at })),
          });
        }
        await this.audit.log(user.userId, 'relationship.create', 'relationship', rel.id, { typeKey: n.typeKey, status }, tx);
        return rel.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
    const created = await this.loadOne(this.prisma, id);
    if (created.status === 'PENDING') {
      await this.notifyRequest(user, id, toPersonNode(created.fromProfile), toPersonNode(created.toProfile), created.typeKey);
    }
    return this.get(user, id, locale);
  }

  private async loadOne(db: Db, id: string) {
    const rel = await db.relationship.findUnique({
      where: { id },
      include: {
        verifications: { orderBy: { createdAt: 'asc' }, include: { user: { select: { profile: { select: { displayName: true } } } } } },
        fromProfile: { include: { stewards: true } },
        toProfile: { include: { stewards: true } },
      },
    });
    if (!rel) throw notFound();
    return rel;
  }

  private isParty(user: AuthUser, from: PersonNode, to: PersonNode) {
    return confirmersOf(from).includes(user.userId) || confirmersOf(to).includes(user.userId);
  }

  /** Relationship details. Visible to parties, or to anyone who can see the edge in the graph. */
  async get(user: AuthUser, id: string, locale: Locale) {
    const rel = await this.loadOne(this.prisma, id);
    const from = toPersonNode(rel.fromProfile);
    const to = toPersonNode(rel.toProfile);
    const loaded: Loaded = { index: new GraphIndex(), profiles: new Map() };
    const ctx = await this.loader.viewer(user, loaded);
    if (!this.isParty(user, from, to)) {
      await this.loader.addProfiles(loaded, [from.id, to.id]);
      loaded.index.addEdge(toEdge(rel));
      if (!this.loader.visibleIndex(loaded, ctx).edges.has(id)) throw notFound();
    }
    const index = new GraphIndex([from, to], [toEdge(rel)]);
    const decisions = rel.verifications.map(toDecision);
    const edge = toEdge(rel);
    return {
      ...edgeDto(edge, index, locale),
      from: personSummary(rel.fromProfile, ctx),
      to: personSummary(rel.toProfile, ctx),
      createdAt: rel.createdAt,
      createdByMe: rel.createdById === user.userId,
      verifications: rel.verifications.map((v) => ({
        side: v.side,
        decision: v.decision,
        comment: v.comment,
        at: v.createdAt,
        by: v.user.profile?.displayName ?? null,
      })),
      awaitingSides: rel.status === 'PENDING' ? pendingSides(edge, from, to, decisions) : [],
      mySides: sidesUserCanDecide(edge, from, to, user.userId),
    };
  }

  async decide(user: AuthUser, id: string, dto: DecisionDto, locale: Locale) {
    let outcome: { before: string; after: string; createdById: string; typeKey: string } | null = null;
    await this.prisma.$transaction(async (tx) => {
      const rel = await this.loadOne(tx, id);
      await this.lockPeople(tx, [rel.fromProfileId, rel.toProfileId]);
      const from = toPersonNode(rel.fromProfile);
      const to = toPersonNode(rel.toProfile);
      const at = new Date();
      const { added, status } = applyDecision(
        toEdge(rel),
        from,
        to,
        rel.verifications.map(toDecision),
        user.userId,
        dto.decision,
        at.toISOString(),
      );
      await tx.relationshipVerification.createMany({
        data: added.map((d) => ({ relationshipId: id, side: d.side, userId: d.userId, decision: d.decision, comment: dto.comment, createdAt: at })),
      });
      await tx.relationship.update({ where: { id }, data: { status } });
      await this.audit.log(user.userId, `relationship.${dto.decision.toLowerCase()}`, 'relationship', id, { status }, tx);
      outcome = { before: rel.status, after: status, createdById: rel.createdById, typeKey: rel.typeKey };
    });
    await this.afterDecision(user, id, outcome);
    return this.get(user, id, locale);
  }

  /** My request notification is done once I decided; the creator hears about a confirmation (not about a rejection). */
  private async afterDecision(user: AuthUser, id: string, o: { before: string; after: string; createdById: string; typeKey: string } | null) {
    if (!o) return;
    await this.prisma.notification.updateMany({ where: { recipientProfileId: user.profileId, entityType: 'relationship', entityId: id, readAt: null }, data: { readAt: new Date() } });
    if (o.before !== 'CONFIRMED' && o.after === 'CONFIRMED' && o.createdById !== user.userId) {
      const creator = await this.prisma.profile.findUnique({ where: { userId: o.createdById }, select: { id: true } });
      if (creator) {
        const friend = FRIEND_TYPES.includes(o.typeKey);
        await this.notifications.notify({
          recipientProfileId: creator.id,
          actorProfileId: user.profileId,
          category: friend ? 'FRIENDS' : 'RELATIONSHIPS',
          type: friend ? 'FRIEND_ACCEPTED' : 'RELATIONSHIP_CONFIRMED',
          entityType: 'relationship',
          entityId: id,
          data: { typeKey: o.typeKey },
          dedupeKey: `relok:${id}`,
        });
      }
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateRelationshipDto, locale: Locale) {
    const rel = await this.loadOne(this.prisma, id);
    const from = toPersonNode(rel.fromProfile);
    const to = toPersonNode(rel.toProfile);
    if (!this.isParty(user, from, to)) throw new AppError(HttpStatus.FORBIDDEN, 'NOT_A_PARTY', 'Only the people involved can change this relationship');
    const isUnion = getType(rel.typeKey).category === 'UNION';
    if (!isUnion && (dto.startDate || dto.endDate || dto.endReason)) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'NOT_A_UNION', 'Dates and end reasons apply to unions only');
    }
    const data: Prisma.RelationshipUpdateInput = {
      visibility: dto.visibility,
      note: dto.note,
      startDate: dto.startDate ? asDate(dto.startDate) : undefined,
      endDate: dto.endDate ? asDate(dto.endDate) : undefined,
      endReason: dto.endReason,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.relationship.update({ where: { id }, data });
      await this.audit.log(user.userId, 'relationship.update', 'relationship', id, { fields: Object.keys(dto) }, tx);
    });
    return this.get(user, id, locale);
  }

  async remove(user: AuthUser, id: string) {
    const rel = await this.loadOne(this.prisma, id);
    if (!this.isParty(user, toPersonNode(rel.fromProfile), toPersonNode(rel.toProfile))) {
      throw new AppError(HttpStatus.FORBIDDEN, 'NOT_A_PARTY', 'Only the people involved can remove this relationship');
    }
    if (rel.status === 'PENDING') {
      // A withdrawn request disappears from the other person's notifications.
      await this.prisma.notification.deleteMany({ where: { entityType: 'relationship', entityId: id, type: { in: ['FRIEND_REQUEST', 'RELATIONSHIP_REQUEST'] } } });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.relationship.delete({ where: { id } });
      await this.audit.log(user.userId, 'relationship.delete', 'relationship', id, { typeKey: rel.typeKey }, tx);
    });
    return { deleted: true };
  }

  /** Requests waiting for a decision from this user (as the person, or as a steward). */
  async awaitingMe(user: AuthUser, locale: Locale) {
    const managed = await this.prisma.profileSteward.findMany({ where: { userId: user.userId }, select: { profileId: true } });
    const ids = [user.profileId, ...managed.map((m) => m.profileId)];
    const rows = await this.prisma.relationship.findMany({
      where: { status: 'PENDING', OR: [{ fromProfileId: { in: ids } }, { toProfileId: { in: ids } }] },
      include: { verifications: true, fromProfile: { include: { stewards: true } }, toProfile: { include: { stewards: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const waiting = rows.filter((r) => {
      const from = toPersonNode(r.fromProfile);
      const to = toPersonNode(r.toProfile);
      const edge = toEdge(r);
      const decisions = r.verifications.map(toDecision);
      const awaiting = pendingSides(edge, from, to, decisions);
      // a side waits for me if I may decide it and have not confirmed it myself already
      return sidesUserCanDecide(edge, from, to, user.userId).some(
        (side) => awaiting.includes(side) && !decisions.some((d) => d.side === side && d.userId === user.userId && d.decision === 'CONFIRM'),
      );
    });
    return Promise.all(waiting.map((r) => this.get(user, r.id, locale)));
  }
}
