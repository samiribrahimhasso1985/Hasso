import { HttpStatus } from '@nestjs/common';
import type { ConnectAudience, ConnectSettings, PresenceMode, Prisma, PrismaClient } from '@prisma/client';
import { RELATIONSHIP_TYPES } from '@ftn/relationship-engine';
import { AppError } from '../common/errors.filter';

/** Relationship types that count as friendship (FRIEND, CLOSE_FRIEND, …). */
export const FRIEND_TYPES = RELATIONSHIP_TYPES.filter((t) => t.category === 'FRIENDSHIP').map((t) => t.key);

/** Settings used while a member has not chosen (docs/EZIDINET_CONNECT_PLAN.md §3). */
export const DEFAULTS: Omit<ConnectSettings, 'profileId' | 'updatedAt'> = {
  friendRequestsFrom: 'EVERYONE',
  followsFrom: 'EVERYONE',
  presenceVisibleTo: 'FRIENDS',
  showLastSeen: true,
  friendListVisibleTo: 'FRIENDS',
  statusMode: 'ONLINE',
};

/** Allowed values per setting (validated on the server). */
export const ALLOWED: Record<'friendRequestsFrom' | 'followsFrom' | 'presenceVisibleTo' | 'friendListVisibleTo', ConnectAudience[]> = {
  friendRequestsFrom: ['EVERYONE', 'FRIENDS_OF_FRIENDS', 'NOBODY'],
  followsFrom: ['EVERYONE', 'FRIENDS', 'NOBODY'],
  presenceVisibleTo: ['EVERYONE', 'FRIENDS', 'NOBODY'],
  friendListVisibleTo: ['EVERYONE', 'FRIENDS', 'ONLY_ME'],
};

export const ONLINE_WINDOW_MS = 2 * 60_000;
export const REQUESTS_PER_DAY = 30;
export const MAX_OPEN_OUTGOING = 100;
export const RETRY_AFTER_REJECTION_DAYS = 30;

type Db = PrismaClient | Prisma.TransactionClient;

export async function settingsOf(db: Db, profileId: string) {
  const row = await db.connectSettings.findUnique({ where: { profileId } });
  return { ...DEFAULTS, ...(row ?? {}) };
}

/** Confirmed friends of a person (profile ids). */
export async function friendIdsOf(db: Db, profileId: string): Promise<Set<string>> {
  const rows = await db.relationship.findMany({
    where: { typeKey: { in: FRIEND_TYPES }, status: 'CONFIRMED', OR: [{ fromProfileId: profileId }, { toProfileId: profileId }] },
    select: { fromProfileId: true, toProfileId: true },
  });
  return new Set(rows.map((r) => (r.fromProfileId === profileId ? r.toProfileId : r.fromProfileId)));
}

/**
 * Whether `requester` may send `target` a friend request under the target's CONNECT setting.
 * Used by CONNECT and by the generic relationship endpoint (QR flow), so the setting cannot be bypassed.
 */
export async function assertFriendRequestAllowed(db: Db, requesterProfileId: string, targetProfileId: string) {
  const s = await settingsOf(db, targetProfileId);
  if (s.friendRequestsFrom === 'EVERYONE') return;
  if (s.friendRequestsFrom === 'FRIENDS_OF_FRIENDS') {
    const [mine, theirs] = await Promise.all([friendIdsOf(db, requesterProfileId), friendIdsOf(db, targetProfileId)]);
    if ([...mine].some((id) => theirs.has(id))) return;
  }
  throw new AppError(HttpStatus.FORBIDDEN, 'REQUESTS_NOT_ACCEPTED', 'This person does not accept friend requests from you');
}

/** Visible online state of a member for one viewer, or null when the viewer may not see it. */
export function presenceFor(
  s: { presenceVisibleTo: ConnectAudience; showLastSeen: boolean; statusMode: PresenceMode },
  lastActiveAt: Date | null | undefined,
  opts: { self: boolean; friend: boolean; now?: number },
) {
  const visible = opts.self || s.presenceVisibleTo === 'EVERYONE' || (s.presenceVisibleTo === 'FRIENDS' && opts.friend);
  if (!visible) return null;
  const now = opts.now ?? Date.now();
  const online = Boolean(lastActiveAt && now - lastActiveAt.getTime() < ONLINE_WINDOW_MS);
  if (!opts.self && s.statusMode === 'INVISIBLE') return { status: 'OFFLINE' as const, lastSeen: null };
  if (online) return { status: (s.statusMode === 'INVISIBLE' ? 'INVISIBLE' : s.statusMode) as PresenceMode | 'INVISIBLE', lastSeen: null };
  return { status: 'OFFLINE' as const, lastSeen: (opts.self || s.showLastSeen) && lastActiveAt ? lastActiveAt.toISOString() : null };
}
