import { HttpStatus, Injectable } from '@nestjs/common';
import type { NotificationCategory, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { personSummary } from '../graph/present';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyInput {
  recipientProfileId: string;
  actorProfileId?: string | null;
  category: NotificationCategory;
  type: string; // e.g. FRIEND_REQUEST, FRIEND_ACCEPTED, NEW_FOLLOWER, RELATIONSHIP_REQUEST
  entityType?: string;
  entityId?: string;
  data?: Prisma.InputJsonValue;
  /** Same key = same event (a repeated follow, a re-sent request) → one notification, moved to the top. */
  dedupeKey?: string;
}

const PAGE = 30;
export const CATEGORIES: NotificationCategory[] = [
  'RELATIONSHIPS', 'FRIENDS', 'FOLLOWS', 'MESSAGES', 'CALLS', 'GROUPS', 'EVENTS', 'INVITATIONS', 'LEARNING', 'CREATORS', 'COLLABORATION', 'COMMUNITY', 'SAFETY',
];

/** Minutes after midnight in a time zone (falls back to UTC for an unknown zone). */
export function minutesInZone(at: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  } catch {
    return at.getUTCHours() * 60 + at.getUTCMinutes();
  }
}

/** Inside quiet hours? Works across midnight (e.g. 22:00–07:00). */
export function inQuietHours(start: number | null, end: number | null, minute: number) {
  if (start === null || end === null || start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/**
 * EZIDINET CONNECT — the one notification service every module uses (friends, relationships, and later messages,
 * calls, groups, events …). It applies the recipient's choices on the server: blocked people never notify,
 * muted categories create nothing, quiet hours and do-not-disturb make a notification silent.
 * Delivery today: in-app (history + unread count). Push is a later delivery channel on the same records.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates (or refreshes) a notification; returns null when the recipient's rules say no. Never throws. */
  async notify(n: NotifyInput) {
    try {
      if (n.actorProfileId && n.actorProfileId === n.recipientProfileId) return null;
      const recipient = await this.prisma.profile.findUnique({ where: { id: n.recipientProfileId }, select: { userId: true } });
      if (!recipient?.userId) return null; // only members receive notifications
      if (n.actorProfileId) {
        const actor = await this.prisma.profile.findUnique({ where: { id: n.actorProfileId }, select: { userId: true } });
        const blocked = await this.prisma.block.findFirst({
          where: {
            OR: [
              { blockerUserId: recipient.userId, blockedProfileId: n.actorProfileId },
              ...(actor?.userId ? [{ blockerUserId: actor.userId, blockedProfileId: n.recipientProfileId }] : []),
            ],
          },
        });
        if (blocked) return null;
      }
      const prefs = await this.prisma.notificationPreferences.findUnique({ where: { profileId: n.recipientProfileId } });
      if (prefs?.mutedCategories.includes(n.category)) return null;
      const now = new Date();
      const silent = Boolean(
        prefs && ((prefs.dndUntil && prefs.dndUntil > now) || inQuietHours(prefs.quietStart, prefs.quietEnd, minutesInZone(now, prefs.timeZone))),
      );
      const data = {
        recipientProfileId: n.recipientProfileId,
        actorProfileId: n.actorProfileId ?? null,
        category: n.category,
        type: n.type,
        entityType: n.entityType ?? null,
        entityId: n.entityId ?? null,
        data: n.data,
        silent,
      };
      if (n.dedupeKey) {
        return await this.prisma.notification.upsert({
          where: { recipientProfileId_dedupeKey: { recipientProfileId: n.recipientProfileId, dedupeKey: n.dedupeKey } },
          create: { ...data, dedupeKey: n.dedupeKey },
          update: { ...data, readAt: null, createdAt: now },
        });
      }
      return await this.prisma.notification.create({ data });
    } catch {
      return null; // a notification must never break the action that caused it
    }
  }

  /** Withdraws notifications about something that no longer applies (e.g. a cancelled request). */
  async withdraw(recipientProfileId: string, dedupeKey: string) {
    await this.prisma.notification.deleteMany({ where: { recipientProfileId, dedupeKey } });
  }

  /** Newest first; `before` = createdAt of the last item of the previous page (cursor pagination). */
  async list(user: AuthUser, opts: { before?: string; unread?: boolean }) {
    const before = opts.before ? new Date(opts.before) : undefined;
    if (before && Number.isNaN(before.getTime())) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_CURSOR', 'Invalid cursor');
    const rows = await this.prisma.notification.findMany({
      where: { recipientProfileId: user.profileId, ...(before ? { createdAt: { lt: before } } : {}), ...(opts.unread ? { readAt: null } : {}) },
      include: { actor: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE + 1,
    });
    const items = rows.slice(0, PAGE).map((r) => ({
      id: r.id,
      category: r.category,
      type: r.type,
      entityType: r.entityType,
      entityId: r.entityId,
      data: r.data,
      silent: r.silent,
      read: Boolean(r.readAt),
      createdAt: r.createdAt,
      // The actor as anyone may see them (public photo only): a notification never widens what you can see.
      actor: r.actor ? personSummary(r.actor, null) : null,
    }));
    return { items, next: rows.length > PAGE ? items[items.length - 1].createdAt : null, unread: await this.unreadCount(user) };
  }

  unreadCount(user: AuthUser) {
    return this.prisma.notification.count({ where: { recipientProfileId: user.profileId, readAt: null } });
  }

  async markRead(user: AuthUser, id: string) {
    const r = await this.prisma.notification.updateMany({ where: { id, recipientProfileId: user.profileId, readAt: null }, data: { readAt: new Date() } });
    const exists = r.count || (await this.prisma.notification.count({ where: { id, recipientProfileId: user.profileId } }));
    if (!exists) throw new AppError(HttpStatus.NOT_FOUND, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    return { unread: await this.unreadCount(user) };
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { recipientProfileId: user.profileId, readAt: null }, data: { readAt: new Date() } });
    return { unread: 0 };
  }

  async remove(user: AuthUser, id: string) {
    const r = await this.prisma.notification.deleteMany({ where: { id, recipientProfileId: user.profileId } });
    if (!r.count) throw new AppError(HttpStatus.NOT_FOUND, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    return { deleted: true };
  }

  async preferences(user: AuthUser) {
    const p = await this.prisma.notificationPreferences.findUnique({ where: { profileId: user.profileId } });
    return {
      mutedCategories: p?.mutedCategories ?? [],
      pushEnabled: p?.pushEnabled ?? false,
      quietStart: p?.quietStart ?? null,
      quietEnd: p?.quietEnd ?? null,
      timeZone: p?.timeZone ?? 'UTC',
      dndUntil: p?.dndUntil ?? null,
      categories: CATEGORIES,
    };
  }

  async updatePreferences(
    user: AuthUser,
    dto: { mutedCategories?: NotificationCategory[]; quietStart?: number | null; quietEnd?: number | null; timeZone?: string; dndMinutes?: number | null },
  ) {
    if (dto.timeZone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: dto.timeZone });
      } catch {
        throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_TIME_ZONE', 'Unknown time zone');
      }
    }
    if ((dto.quietStart === null) !== (dto.quietEnd === null) && dto.quietStart !== undefined && dto.quietEnd !== undefined) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'QUIET_HOURS_INCOMPLETE', 'Quiet hours need a start and an end');
    }
    const data: Prisma.NotificationPreferencesUncheckedUpdateInput = {
      mutedCategories: dto.mutedCategories ? [...new Set(dto.mutedCategories)] : undefined,
      quietStart: dto.quietStart,
      quietEnd: dto.quietEnd,
      timeZone: dto.timeZone,
      dndUntil: dto.dndMinutes === undefined ? undefined : dto.dndMinutes === null ? null : new Date(Date.now() + dto.dndMinutes * 60_000),
    };
    await this.prisma.notificationPreferences.upsert({
      where: { profileId: user.profileId },
      create: { ...(data as Prisma.NotificationPreferencesUncheckedCreateInput), profileId: user.profileId },
      update: data,
    });
    return this.preferences(user);
  }
}
