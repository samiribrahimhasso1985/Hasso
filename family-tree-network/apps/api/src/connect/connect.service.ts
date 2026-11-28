import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, Profile } from '@prisma/client';
import { GraphIndex, type Locale, type ViewerContext } from '@ftn/relationship-engine';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { GraphLoader, type Loaded } from '../graph/graph-loader.service';
import { canSeePerson, personSummary } from '../graph/present';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FIELD_DEFAULTS } from '../profiles/profiles.service';
import { RelationshipsService } from '../relationships/relationships.service';
import type { SettingsDto } from './dto';
import {
  ALLOWED,
  FRIEND_TYPES,
  MAX_OPEN_OUTGOING,
  REQUESTS_PER_DAY,
  RETRY_AFTER_REJECTION_DAYS,
  assertFriendRequestAllowed,
  friendIdsOf,
  presenceFor,
  settingsOf,
} from './policy';

const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found');
const DAY = 24 * 60 * 60_000;
const PAGE = 50;

export type FriendState = 'SELF' | 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'DECLINED' | 'BLOCKED';

/**
 * EZIDINET CONNECT — Phase 1: friends (FRIENDSHIP relationships), followers, presence, discovery and the
 * CONNECT privacy settings. Every rule is enforced here on the server; the web only reflects the result.
 */
@Injectable()
export class ConnectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: GraphLoader,
    private readonly rels: RelationshipsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── helpers ────────────────────────────────────────────────────────────────────────────────────────

  private async viewer(user: AuthUser): Promise<ViewerContext> {
    const loaded: Loaded = { index: new GraphIndex(), profiles: new Map() };
    return this.loader.viewer(user, loaded);
  }

  /**
   * A member profile the viewer is allowed to see: the usual rules (discoverable, network, family; children only
   * within their family), plus people already connected to the viewer through CONNECT (a request, a friendship,
   * a follow in either direction) — so a request from a non-discoverable member can be answered.
   * A person who blocked the viewer stays invisible; the blocker still sees whom they blocked.
   */
  private async target(user: AuthUser, ctx: ViewerContext, id: string, opts: { allowBlockedByMe?: boolean } = {}) {
    const p = await this.prisma.profile.findUnique({ where: { id }, include: { stewards: true } });
    if (!p || !p.userId || p.deathDate) throw notFound();
    if (ctx.blockedPersonIds.has(id)) {
      const mine = opts.allowBlockedByMe && (await this.prisma.block.findUnique({ where: { blockerUserId_blockedProfileId: { blockerUserId: user.userId, blockedProfileId: id } } }));
      if (!mine) throw notFound();
      return p;
    }
    if (canSeePerson(ctx, { ...p, stewardUserIds: p.stewards.map((s) => s.userId) })) return p;
    if (p.isMinor) throw notFound();
    const [rel, follow] = await Promise.all([
      this.prisma.relationship.findFirst({ where: { typeKey: { in: FRIEND_TYPES }, OR: [{ fromProfileId: user.profileId, toProfileId: id }, { fromProfileId: id, toProfileId: user.profileId }] }, select: { id: true } }),
      this.prisma.follow.findFirst({ where: { OR: [{ followerProfileId: user.profileId, followeeProfileId: id }, { followerProfileId: id, followeeProfileId: user.profileId }] } }),
    ]);
    if (!rel && !follow) throw notFound();
    return p;
  }

  /** Children only connect with their family: no stranger requests or followers in either direction. */
  private async assertNotStrangerWithChild(user: AuthUser, ctx: ViewerContext, target: Profile) {
    const me = await this.prisma.profile.findUniqueOrThrow({ where: { id: user.profileId } });
    if ((target.isMinor || me.isMinor) && !ctx.familyPersonIds.has(target.id)) {
      throw new AppError(HttpStatus.FORBIDDEN, 'MINOR_PROTECTED', 'Children connect only with their family');
    }
  }

  private friendshipsBetween(a: string, b: string) {
    return this.prisma.relationship.findMany({
      where: {
        typeKey: { in: FRIEND_TYPES },
        OR: [
          { fromProfileId: a, toProfileId: b },
          { fromProfileId: b, toProfileId: a },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async state(user: AuthUser, ctx: ViewerContext, targetId: string) {
    if (targetId === user.profileId) return { state: 'SELF' as FriendState, requestId: null as string | null, declinedAt: null as Date | null };
    if (ctx.blockedPersonIds.has(targetId)) return { state: 'BLOCKED' as FriendState, requestId: null, declinedAt: null };
    const rows = await this.friendshipsBetween(user.profileId, targetId);
    const confirmed = rows.find((r) => r.status === 'CONFIRMED');
    if (confirmed) return { state: 'FRIENDS' as FriendState, requestId: confirmed.id, declinedAt: null };
    const pending = rows.find((r) => r.status === 'PENDING');
    if (pending) return { state: (pending.createdById === user.userId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED') as FriendState, requestId: pending.id, declinedAt: null };
    const declined = rows.find((r) => r.status === 'REJECTED' && r.createdById === user.userId);
    if (declined && Date.now() - declined.updatedAt.getTime() < RETRY_AFTER_REJECTION_DAYS * DAY) {
      return { state: 'DECLINED' as FriendState, requestId: declined.id, declinedAt: declined.updatedAt };
    }
    return { state: 'NONE' as FriendState, requestId: null, declinedAt: null };
  }

  private async presenceMap(viewerProfileId: string, ids: string[], viewerFriends: Set<string>) {
    const [settings, presence] = await Promise.all([
      this.prisma.connectSettings.findMany({ where: { profileId: { in: ids } } }),
      this.prisma.userPresence.findMany({ where: { profileId: { in: ids } } }),
    ]);
    const s = new Map(settings.map((x) => [x.profileId, x]));
    const p = new Map(presence.map((x) => [x.profileId, x.lastActiveAt]));
    return new Map(
      ids.map((id) => [
        id,
        presenceFor({ ...{ presenceVisibleTo: 'FRIENDS', showLastSeen: true, statusMode: 'ONLINE' }, ...(s.get(id) ?? {}) } as never, p.get(id), {
          self: id === viewerProfileId,
          friend: viewerFriends.has(id),
        }),
      ]),
    );
  }

  private async people(ctx: ViewerContext, ids: string[], viewerProfileId: string, myFriends?: Set<string>) {
    if (!ids.length) return [];
    const friends = myFriends ?? (await friendIdsOf(this.prisma, viewerProfileId));
    const [rows, presence] = await Promise.all([
      this.prisma.profile.findMany({ where: { id: { in: ids } } }),
      this.presenceMap(viewerProfileId, ids, friends),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Profile => Boolean(p))
      .map((p) => ({ ...personSummary(p, ctx), presence: presence.get(p.id) ?? null }));
  }

  // ── person card ────────────────────────────────────────────────────────────────────────────────────

  /** Everything the person card needs: friendship and follow state, mutual friends, presence, allowed actions. */
  async person(user: AuthUser, id: string) {
    const ctx = await this.viewer(user);
    const p = await this.target(user, ctx, id, { allowBlockedByMe: true });
    if (ctx.blockedPersonIds.has(id)) {
      // The blocker only sees whom they blocked (to undo it) — nothing else about that person.
      return {
        person: personSummary(p, ctx),
        friendship: { state: 'BLOCKED' as FriendState, requestId: null },
        following: false, followsMe: false, followers: 0,
        mutualFriends: { count: 0, people: [] },
        presence: null,
        can: { sendRequest: false, follow: false, unfollow: false, viewFriends: false },
      };
    }
    const [st, myFriends, theirFriends, settings, following, followsMe, followers] = await Promise.all([
      this.state(user, ctx, id),
      friendIdsOf(this.prisma, user.profileId),
      friendIdsOf(this.prisma, id),
      settingsOf(this.prisma, id),
      this.prisma.follow.findUnique({ where: { followerProfileId_followeeProfileId: { followerProfileId: user.profileId, followeeProfileId: id } } }),
      this.prisma.follow.findUnique({ where: { followerProfileId_followeeProfileId: { followerProfileId: id, followeeProfileId: user.profileId } } }),
      this.prisma.follow.count({ where: { followeeProfileId: id } }),
    ]);
    const mutual = [...myFriends].filter((f) => theirFriends.has(f));
    const self = id === user.profileId;
    const childBarrier = (p.isMinor || (await this.prisma.profile.findUniqueOrThrow({ where: { id: user.profileId } })).isMinor) && !ctx.familyPersonIds.has(id);
    const isFriend = myFriends.has(id);
    const canRequest =
      !self && !childBarrier && st.state === 'NONE' &&
      (settings.friendRequestsFrom === 'EVERYONE' || (settings.friendRequestsFrom === 'FRIENDS_OF_FRIENDS' && mutual.length > 0));
    const canFollow =
      !self && !p.isMinor && !childBarrier && st.state !== 'BLOCKED' && !following &&
      (settings.followsFrom === 'EVERYONE' || (settings.followsFrom === 'FRIENDS' && isFriend));
    const presenceRow = await this.prisma.userPresence.findUnique({ where: { profileId: id } });
    return {
      person: personSummary(p, ctx, self),
      friendship: { state: st.state, requestId: st.requestId },
      following: Boolean(following),
      followsMe: Boolean(followsMe),
      followers,
      mutualFriends: { count: mutual.length, people: await this.people(ctx, mutual.slice(0, 6), user.profileId, myFriends) },
      presence: presenceFor(settings, presenceRow?.lastActiveAt, { self, friend: isFriend }),
      can: { sendRequest: canRequest, follow: canFollow, unfollow: Boolean(following), viewFriends: self || settings.friendListVisibleTo === 'EVERYONE' || (settings.friendListVisibleTo === 'FRIENDS' && isFriend) },
    };
  }

  // ── friend requests ────────────────────────────────────────────────────────────────────────────────

  async sendRequest(user: AuthUser, targetId: string, locale: Locale) {
    if (targetId === user.profileId) throw new AppError(HttpStatus.BAD_REQUEST, 'SELF_REQUEST', 'You cannot send a request to yourself');
    const ctx = await this.viewer(user);
    const target = await this.target(user, ctx, targetId);
    if (ctx.blockedPersonIds.has(targetId)) throw notFound();
    await this.assertNotStrangerWithChild(user, ctx, target);

    const st = await this.state(user, ctx, targetId);
    if (st.state === 'FRIENDS') throw new AppError(HttpStatus.CONFLICT, 'ALREADY_FRIENDS', 'You are already friends');
    if (st.state === 'REQUEST_SENT') throw new AppError(HttpStatus.CONFLICT, 'REQUEST_EXISTS', 'Your request is already waiting');
    if (st.state === 'REQUEST_RECEIVED') throw new AppError(HttpStatus.CONFLICT, 'INCOMING_REQUEST', 'This person already sent you a request — accept it instead', { requestId: st.requestId });
    if (st.state === 'DECLINED') throw new AppError(HttpStatus.TOO_MANY_REQUESTS, 'RECENTLY_DECLINED', 'This person declined your request recently');
    await assertFriendRequestAllowed(this.prisma, user.profileId, targetId);

    // Anti-spam: daily limit (cancelled requests still count) and a cap on open requests.
    const [today, open] = await Promise.all([
      this.prisma.auditLog.count({ where: { actorId: user.userId, action: 'friend.request', createdAt: { gte: new Date(Date.now() - DAY) } } }),
      this.prisma.relationship.count({ where: { createdById: user.userId, typeKey: { in: FRIEND_TYPES }, status: 'PENDING' } }),
    ]);
    if (today >= REQUESTS_PER_DAY) throw new AppError(HttpStatus.TOO_MANY_REQUESTS, 'DAILY_LIMIT', 'You have sent many requests today. Please try again tomorrow.');
    if (open >= MAX_OPEN_OUTGOING) throw new AppError(HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_OPEN', 'Too many requests are still waiting. Cancel some first.');

    // Old declined requests (older than the waiting time) make room for a new one.
    await this.prisma.relationship.deleteMany({
      where: { typeKey: { in: FRIEND_TYPES }, status: { in: ['REJECTED', 'DISPUTED'] }, OR: [{ fromProfileId: user.profileId, toProfileId: targetId }, { fromProfileId: targetId, toProfileId: user.profileId }] },
    });
    const rel = await this.rels.create(user, { personId: user.profileId, relatedPersonId: targetId, type: 'FRIEND' }, locale);
    await this.audit.log(user.userId, 'friend.request', 'relationship', rel.id, { to: targetId });
    return this.person(user, targetId);
  }

  private async pendingRequest(user: AuthUser, id: string) {
    const rel = await this.prisma.relationship.findUnique({ where: { id } });
    if (!rel || !FRIEND_TYPES.includes(rel.typeKey) || rel.status !== 'PENDING') {
      throw new AppError(HttpStatus.NOT_FOUND, 'REQUEST_NOT_FOUND', 'Request not found');
    }
    const mine = rel.fromProfileId === user.profileId || rel.toProfileId === user.profileId;
    if (!mine) throw new AppError(HttpStatus.NOT_FOUND, 'REQUEST_NOT_FOUND', 'Request not found');
    return rel;
  }

  async respond(user: AuthUser, id: string, accept: boolean, locale: Locale) {
    const rel = await this.pendingRequest(user, id);
    if (rel.createdById === user.userId) throw new AppError(HttpStatus.FORBIDDEN, 'OWN_REQUEST', 'Only the person who received the request can answer it');
    await this.rels.decide(user, id, { decision: accept ? 'CONFIRM' : 'REJECT' }, locale);
    await this.audit.log(user.userId, accept ? 'friend.accept' : 'friend.reject', 'relationship', id);
    const other = rel.fromProfileId === user.profileId ? rel.toProfileId : rel.fromProfileId;
    return { state: accept ? 'ACCEPTED' : 'REJECTED', personId: other };
  }

  async cancel(user: AuthUser, id: string) {
    const rel = await this.pendingRequest(user, id);
    if (rel.createdById !== user.userId) throw new AppError(HttpStatus.FORBIDDEN, 'NOT_YOUR_REQUEST', 'Only the sender can cancel a request');
    await this.rels.remove(user, id);
    await this.audit.log(user.userId, 'friend.cancel', 'relationship', id);
    return { state: 'CANCELLED' };
  }

  async requests(user: AuthUser, direction: 'incoming' | 'outgoing') {
    const ctx = await this.viewer(user);
    const rows = await this.prisma.relationship.findMany({
      where: {
        typeKey: { in: FRIEND_TYPES },
        status: 'PENDING',
        OR: [{ fromProfileId: user.profileId }, { toProfileId: user.profileId }],
        ...(direction === 'outgoing' ? { createdById: user.userId } : { NOT: { createdById: user.userId } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const visible = rows
      .map((r) => ({ r, other: r.fromProfileId === user.profileId ? r.toProfileId : r.fromProfileId }))
      .filter((x) => !ctx.blockedPersonIds.has(x.other));
    const myFriends = await friendIdsOf(this.prisma, user.profileId);
    const people = await this.people(ctx, visible.map((x) => x.other), user.profileId, myFriends);
    const byId = new Map(people.map((p) => [p.id, p]));
    const result = [];
    for (const x of visible) {
      const theirs = await friendIdsOf(this.prisma, x.other);
      result.push({
        id: x.r.id,
        state: 'PENDING',
        createdAt: x.r.createdAt,
        person: byId.get(x.other),
        mutualFriends: [...myFriends].filter((f) => theirs.has(f)).length,
      });
    }
    return result.filter((r) => r.person);
  }

  // ── friends ────────────────────────────────────────────────────────────────────────────────────────

  async friends(user: AuthUser, profileId: string, page = 0) {
    const ctx = await this.viewer(user);
    if (profileId !== user.profileId) {
      await this.target(user, ctx, profileId);
      const s = await settingsOf(this.prisma, profileId);
      const myFriends = await friendIdsOf(this.prisma, user.profileId);
      const allowed = s.friendListVisibleTo === 'EVERYONE' || (s.friendListVisibleTo === 'FRIENDS' && myFriends.has(profileId));
      if (!allowed) throw new AppError(HttpStatus.FORBIDDEN, 'FRIEND_LIST_PRIVATE', 'This friend list is private');
    }
    const ids = [...(await friendIdsOf(this.prisma, profileId))].filter((id) => !ctx.blockedPersonIds.has(id));
    const people = await this.people(ctx, ids, user.profileId);
    people.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { total: people.length, page, items: people.slice(page * PAGE, (page + 1) * PAGE) };
  }

  async removeFriend(user: AuthUser, profileId: string) {
    const rows = (await this.friendshipsBetween(user.profileId, profileId)).filter((r) => r.status === 'CONFIRMED');
    if (!rows.length) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FRIENDS', 'You are not friends');
    for (const r of rows) await this.rels.remove(user, r.id);
    await this.audit.log(user.userId, 'friend.remove', 'profile', profileId);
    return { state: 'NONE' };
  }

  // ── following ──────────────────────────────────────────────────────────────────────────────────────

  async follow(user: AuthUser, targetId: string) {
    if (targetId === user.profileId) throw new AppError(HttpStatus.BAD_REQUEST, 'SELF_FOLLOW', 'You cannot follow yourself');
    const ctx = await this.viewer(user);
    const target = await this.target(user, ctx, targetId);
    if (ctx.blockedPersonIds.has(targetId)) throw notFound();
    if (target.isMinor) throw new AppError(HttpStatus.FORBIDDEN, 'MINOR_PROTECTED', 'Children cannot be followed');
    await this.assertNotStrangerWithChild(user, ctx, target);
    const s = await settingsOf(this.prisma, targetId);
    const friend = (await friendIdsOf(this.prisma, user.profileId)).has(targetId);
    if (s.followsFrom === 'NOBODY' || (s.followsFrom === 'FRIENDS' && !friend)) {
      throw new AppError(HttpStatus.FORBIDDEN, 'FOLLOWS_NOT_ACCEPTED', 'This person does not accept followers');
    }
    await this.prisma.follow.upsert({
      where: { followerProfileId_followeeProfileId: { followerProfileId: user.profileId, followeeProfileId: targetId } },
      create: { followerProfileId: user.profileId, followeeProfileId: targetId },
      update: {},
    });
    await this.audit.log(user.userId, 'follow.create', 'profile', targetId);
    await this.notifications.notify({
      recipientProfileId: targetId,
      actorProfileId: user.profileId,
      category: 'FOLLOWS',
      type: 'NEW_FOLLOWER',
      entityType: 'profile',
      entityId: user.profileId,
      dedupeKey: `follow:${user.profileId}`,
    });
    return { following: true };
  }

  async unfollow(user: AuthUser, targetId: string) {
    await this.prisma.follow.deleteMany({ where: { followerProfileId: user.profileId, followeeProfileId: targetId } });
    await this.notifications.withdraw(targetId, `follow:${user.profileId}`);
    await this.audit.log(user.userId, 'follow.delete', 'profile', targetId);
    return { following: false };
  }

  /** Own followers / people I follow (lists are visible to the owner only). */
  async followList(user: AuthUser, which: 'followers' | 'following', page = 0) {
    const ctx = await this.viewer(user);
    const where = which === 'followers' ? { followeeProfileId: user.profileId } : { followerProfileId: user.profileId };
    const [total, rows] = await Promise.all([
      this.prisma.follow.count({ where }),
      this.prisma.follow.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page * PAGE, take: PAGE }),
    ]);
    const ids = rows.map((r) => (which === 'followers' ? r.followerProfileId : r.followeeProfileId)).filter((id) => !ctx.blockedPersonIds.has(id));
    return { total, page, items: await this.people(ctx, ids, user.profileId) };
  }

  // ── discover ───────────────────────────────────────────────────────────────────────────────────────

  /**
   * Search (q) or suggestions. Only adults who chose to be discoverable; reasons are mutual friends and
   * languages both people made public. Never religion, origin, name, photo or location.
   */
  async discover(user: AuthUser, q?: string, filters: { lang?: string; interest?: string; skill?: string } = {}) {
    const ctx = await this.viewer(user);
    const myFriends = await friendIdsOf(this.prisma, user.profileId);
    const pending = await this.prisma.relationship.findMany({
      where: { typeKey: { in: FRIEND_TYPES }, status: 'PENDING', OR: [{ fromProfileId: user.profileId }, { toProfileId: user.profileId }] },
      select: { fromProfileId: true, toProfileId: true },
    });
    const exclude = new Set([user.profileId, ...myFriends, ...ctx.blockedPersonIds, ...pending.flatMap((p) => [p.fromProfileId, p.toProfileId])]);
    const base: Prisma.ProfileWhereInput = { searchable: true, isMinor: false, deathDate: null, userId: { not: null } };
    const me = await this.prisma.profile.findUniqueOrThrow({ where: { id: user.profileId }, include: { privacy: true } });
    const mine = { languages: me.languages, interests: me.interests, skills: me.skills };

    // Filters match only what the other person made PUBLIC (missing setting = the field default, PUBLIC).
    const isPublic = (field: 'LANGUAGES' | 'INTERESTS' | 'SKILLS'): Prisma.ProfileWhereInput => ({ privacy: { none: { field, visibility: { not: 'PUBLIC' } } } });
    const tag = (x?: string) => x?.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const filterWhere: Prisma.ProfileWhereInput[] = [];
    if (filters.lang) filterWhere.push({ languages: { has: tag(filters.lang) }, ...isPublic('LANGUAGES') });
    if (filters.interest) filterWhere.push({ interests: { has: tag(filters.interest) }, ...isPublic('INTERESTS') });
    if (filters.skill) filterWhere.push({ skills: { has: tag(filters.skill) }, ...isPublic('SKILLS') });

    const term = q?.trim() ?? '';
    if (term.length >= 2 || filterWhere.length) {
      const rows = await this.prisma.profile.findMany({
        where: {
          AND: [
            base,
            { id: { notIn: [...ctx.blockedPersonIds, user.profileId] } },
            ...(term.length >= 2 ? [{ displayName: { contains: term, mode: 'insensitive' as const } }] : []),
            ...filterWhere,
          ],
        },
        orderBy: { displayName: 'asc' },
        take: 30,
      });
      return this.withReasons(ctx, user.profileId, rows.map((r) => r.id), myFriends, mine);
    }

    // Suggestions: friends of friends (ranked by mutual friends), then shared public languages, interests and skills.
    const score = new Map<string, number>();
    if (myFriends.size) {
      const rows = await this.prisma.relationship.findMany({
        where: {
          typeKey: { in: FRIEND_TYPES },
          status: 'CONFIRMED',
          OR: [{ fromProfileId: { in: [...myFriends] } }, { toProfileId: { in: [...myFriends] } }],
        },
        select: { fromProfileId: true, toProfileId: true },
        take: 5000,
      });
      for (const r of rows) {
        for (const [a, b] of [[r.fromProfileId, r.toProfileId], [r.toProfileId, r.fromProfileId]]) {
          if (myFriends.has(a) && !exclude.has(b)) score.set(b, (score.get(b) ?? 0) + 10);
        }
      }
    }
    const shared: Prisma.ProfileWhereInput[] = [];
    if (mine.languages.length) shared.push({ languages: { hasSome: mine.languages }, ...isPublic('LANGUAGES') });
    if (mine.interests.length) shared.push({ interests: { hasSome: mine.interests }, ...isPublic('INTERESTS') });
    if (mine.skills.length) shared.push({ skills: { hasSome: mine.skills }, ...isPublic('SKILLS') });
    if (shared.length) {
      const rows = await this.prisma.profile.findMany({ where: { AND: [base, { id: { notIn: [...exclude] } }, { OR: shared }] }, select: { id: true }, take: 80 });
      for (const r of rows) score.set(r.id, (score.get(r.id) ?? 0) + 1);
    }
    const candidates = await this.prisma.profile.findMany({ where: { ...base, id: { in: [...score.keys()] } }, select: { id: true } });
    const ids = candidates.map((c) => c.id).sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0)).slice(0, 20);
    return this.withReasons(ctx, user.profileId, ids, myFriends, mine);
  }

  /** Why someone is suggested: mutual friends and what both share — only the other person's PUBLIC fields. */
  private async withReasons(ctx: ViewerContext, me: string, ids: string[], myFriends: Set<string>, mine: { languages: string[]; interests: string[]; skills: string[] }) {
    const people = await this.people(ctx, ids, me, myFriends);
    const profiles = await this.prisma.profile.findMany({ where: { id: { in: ids } }, include: { privacy: true } });
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const out = [];
    for (const p of people) {
      const theirs = await friendIdsOf(this.prisma, p.id);
      const prof = byId.get(p.id)!;
      const pub = (f: 'LANGUAGES' | 'INTERESTS' | 'SKILLS') => (prof.privacy.find((x) => x.field === f)?.visibility ?? FIELD_DEFAULTS[f]) === 'PUBLIC';
      out.push({
        ...p,
        reasons: {
          mutualFriends: [...myFriends].filter((f) => theirs.has(f)).length,
          sharedLanguages: pub('LANGUAGES') ? prof.languages.filter((l) => mine.languages.includes(l)) : [],
          sharedInterests: pub('INTERESTS') ? prof.interests.filter((l) => mine.interests.includes(l)) : [],
          sharedSkills: pub('SKILLS') ? prof.skills.filter((l) => mine.skills.includes(l)) : [],
        },
        /** What the person shows publicly, for "find by skill / interest" results. */
        interests: pub('INTERESTS') ? prof.interests.slice(0, 6) : [],
        skills: pub('SKILLS') ? prof.skills.slice(0, 6) : [],
      });
    }
    return out;
  }

  // ── settings & presence ────────────────────────────────────────────────────────────────────────────

  async getSettings(user: AuthUser) {
    const s = await settingsOf(this.prisma, user.profileId);
    const { profileId: _p, updatedAt: _u, ...rest } = { profileId: '', updatedAt: null, ...s };
    return { ...rest, options: ALLOWED };
  }

  async updateSettings(user: AuthUser, dto: SettingsDto) {
    for (const k of Object.keys(ALLOWED) as (keyof typeof ALLOWED)[]) {
      const v = dto[k];
      if (v !== undefined && !ALLOWED[k].includes(v)) throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_SETTING', `${k} cannot be ${v}`);
    }
    await this.prisma.connectSettings.upsert({ where: { profileId: user.profileId }, create: { profileId: user.profileId, ...dto }, update: dto });
    await this.audit.log(user.userId, 'connect.settings', 'profile', user.profileId, { fields: Object.keys(dto) });
    return this.getSettings(user);
  }

  /** Heartbeat while the app is open (written at most every 30 s). */
  async heartbeat(user: AuthUser) {
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO user_presence (profile_id, last_active_at) VALUES (${user.profileId}::uuid, ${now})
      ON CONFLICT (profile_id) DO UPDATE SET last_active_at = EXCLUDED.last_active_at
      WHERE user_presence.last_active_at < ${new Date(now.getTime() - 30_000)}`;
    const s = await settingsOf(this.prisma, user.profileId);
    return { status: s.statusMode, at: now.toISOString() };
  }

  /**
   * CONNECT Home in one request: counts, waiting friend requests, friends who are online now (only where they allow
   * it), suggestions and the latest notifications. Everything comes from the same services and rules as the other
   * screens — the home page never shows more than they do.
   */
  async home(user: AuthUser) {
    const [summary, requests, friends, suggestions, notifications, me] = await Promise.all([
      this.summary(user),
      this.requests(user, 'incoming'),
      this.friends(user, user.profileId),
      this.discover(user),
      this.notifications.list(user, {}),
      this.prisma.profile.findUniqueOrThrow({ where: { id: user.profileId }, select: { displayName: true } }),
    ]);
    const following = await this.prisma.follow.count({ where: { followerProfileId: user.profileId } });
    return {
      displayName: me.displayName,
      counts: { ...summary, following, unreadNotifications: notifications.unread },
      requests: requests.slice(0, 5),
      online: friends.items.filter((f) => f.presence && f.presence.status !== 'OFFLINE').slice(0, 12),
      suggestions: suggestions.slice(0, 6),
      notifications: notifications.items.slice(0, 6),
    };
  }

  /** Counts for the Friends tab badge. */
  async summary(user: AuthUser) {
    const [incoming, followers] = await Promise.all([
      this.prisma.relationship.count({
        where: { typeKey: { in: FRIEND_TYPES }, status: 'PENDING', NOT: { createdById: user.userId }, OR: [{ fromProfileId: user.profileId }, { toProfileId: user.profileId }] },
      }),
      this.prisma.follow.count({ where: { followeeProfileId: user.profileId } }),
    ]);
    return { incomingRequests: incoming, followers, friends: (await friendIdsOf(this.prisma, user.profileId)).size };
  }
}
