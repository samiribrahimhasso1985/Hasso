import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Event, type EventCategory, type EventTemplate, type Profile } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { friendIdsOf } from '../connect/policy';
import { personSummary } from '../graph/present';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EventDto } from './dto';
import { StaffService } from './staff';

/** Template suggested for a category when the organizer does not choose one. */
export const SUGGESTED_TEMPLATE: Record<EventCategory, EventTemplate> = {
  CULTURAL_FESTIVAL: 'CULTURAL',
  RELIGIOUS_CELEBRATION: 'RELIGIOUS',
  COMMUNITY_GATHERING: 'COMMUNITY',
  HERITAGE_EXHIBITION: 'HERITAGE',
  MUSIC: 'MUSIC',
  EDUCATIONAL: 'COMMUNITY',
  YOUTH: 'COMMUNITY',
  CHARITY: 'COMMUNITY',
  MEMORIAL: 'MEMORIAL',
  ONLINE: 'ONLINE',
  INTERNATIONAL_MEETUP: 'INTERNATIONAL',
};

/** Proportionate review: ordinary events publish at once; events for young people and fundraising are reviewed first. */
export const NEEDS_REVIEW: EventCategory[] = ['YOUTH', 'CHARITY'];
const PAGE = 24;
const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found');

interface Viewer {
  user: AuthUser | null;
  staff: boolean;
  friends: Set<string>;
  blocked: Set<string>;
}

type Loaded = Event & { organizer: Profile; sessions: { id: string; title: string; startsAt: Date; endsAt: Date; stage: string | null; host: string | null; kind: string | null; status: string }[]; _count: { attendees: number } };

/**
 * EZIDINET Events — the one event service (festivals, gatherings, exhibitions, online meetings, memorials …).
 * Visibility is decided here on the server: audience (public / friends / private), status (drafts and events in review
 * only for their organizer and staff), blocks in both directions, and a venue that can be limited to participants.
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly staff: StaffService,
  ) {}

  private async viewer(user: AuthUser | null): Promise<Viewer> {
    if (!user) return { user: null, staff: false, friends: new Set(), blocked: new Set() };
    const [staff, friends, blocks] = await Promise.all([
      this.staff.isStaff(user),
      friendIdsOf(this.prisma, user.profileId),
      this.prisma.block.findMany({
        where: { OR: [{ blockerUserId: user.userId }, { blockedProfileId: user.profileId }] },
        select: { blockedProfileId: true, blocker: { select: { profile: { select: { id: true } } } } },
      }),
    ]);
    const blocked = new Set<string>();
    for (const b of blocks) {
      if (b.blockedProfileId !== user.profileId) blocked.add(b.blockedProfileId);
      const other = b.blocker.profile?.id;
      if (other && other !== user.profileId) blocked.add(other);
    }
    return { user, staff, friends, blocked };
  }

  private isOrganizer(v: Viewer, e: Pick<Event, 'organizerProfileId'>) {
    return Boolean(v.user && v.user.profileId === e.organizerProfileId);
  }

  /** The single visibility rule for events. */
  canView(v: Viewer, e: Pick<Event, 'organizerProfileId' | 'status' | 'audience'>) {
    if (this.isOrganizer(v, e) || v.staff) return true;
    if (v.blocked.has(e.organizerProfileId)) return false;
    if (e.status !== 'PUBLISHED' && e.status !== 'CANCELLED') return false;
    if (e.audience === 'PUBLIC') return true;
    if (e.audience === 'FRIENDS') return v.friends.has(e.organizerProfileId);
    return false;
  }

  private async load(id: string) {
    const e = await this.prisma.event.findUnique({
      where: { id },
      include: { organizer: true, sessions: { orderBy: { startsAt: 'asc' } }, _count: { select: { attendees: true } } },
    });
    if (!e) throw notFound();
    return e as Loaded;
  }

  private async mine(user: AuthUser, id: string) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw notFound();
    if (e.organizerProfileId !== user.profileId && !(await this.staff.isStaff(user))) throw notFound();
    return e;
  }

  /** Card data (lists) — never includes a private venue. */
  private card(e: Loaded, v: Viewer, extra: { saved?: boolean; registered?: boolean } = {}) {
    return {
      id: e.id,
      title: e.title,
      summary: e.summary,
      category: e.category,
      template: e.template,
      audience: e.audience,
      status: e.status,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      timeZone: e.timeZone,
      country: e.country,
      city: e.city,
      online: Boolean(e.onlineUrl),
      hostName: e.hostName,
      organizer: personSummary(e.organizer, null),
      registration: e.registration,
      capacity: e.capacity,
      registered: extra.registered ?? false,
      saved: extra.saved ?? false,
      attendees: e._count.attendees,
      spotsLeft: e.capacity ? Math.max(0, e.capacity - e._count.attendees) : null,
      featured: Boolean(e.featuredAt),
      calendarDayId: e.calendarDayId,
      isOrganizer: this.isOrganizer(v, e),
    };
  }

  private async detail(e: Loaded, v: Viewer) {
    const me = v.user?.profileId;
    const [saved, registered] = me
      ? await Promise.all([
          this.prisma.eventSave.findUnique({ where: { eventId_profileId: { eventId: e.id, profileId: me } } }),
          this.prisma.eventAttendee.findUnique({ where: { eventId_profileId: { eventId: e.id, profileId: me } } }),
        ])
      : [null, null];
    const venueVisible = e.venuePublic || Boolean(registered) || this.isOrganizer(v, e) || v.staff;
    const calendarDay = e.calendarDayId ? await this.prisma.calendarDay.findUnique({ where: { id: e.calendarDayId }, select: { id: true, slug: true, names: true, published: true } }) : null;
    return {
      ...this.card(e, v, { saved: Boolean(saved), registered: Boolean(registered) }),
      description: e.description,
      venue: venueVisible ? e.venue : null,
      venueHidden: !venueVisible && Boolean(e.venue),
      onlineUrl: e.onlineUrl && (e.audience === 'PUBLIC' || registered || this.isOrganizer(v, e) || v.staff || e.registration === 'NONE') ? e.onlineUrl : null,
      registrationUrl: e.registrationUrl,
      contact: e.contact,
      speakers: (e.speakers as { name: string; role?: string }[] | null) ?? [],
      faq: (e.faq as { q: string; a: string }[] | null) ?? [],
      sessions: e.sessions.map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt, endsAt: s.endsAt, stage: s.stage, host: s.host, kind: s.kind, status: s.status })),
      calendarDay: calendarDay && (calendarDay.published || v.staff) ? calendarDay : null,
      reviewNote: this.isOrganizer(v, e) || v.staff ? e.reviewNote : null,
      canEdit: this.isOrganizer(v, e) || v.staff,
    };
  }

  private validateTimes(starts: Date, ends: Date, sessions?: { startsAt: string; endsAt: string }[]) {
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends < starts) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_TIMES', 'The end must be after the start');
    }
    for (const s of sessions ?? []) {
      if (new Date(s.endsAt) < new Date(s.startsAt)) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_SESSION_TIMES', 'A program item ends before it starts');
    }
  }

  private checkZone(tz?: string) {
    if (!tz) return;
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
    } catch {
      throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_TIME_ZONE', 'Unknown time zone');
    }
  }

  private async statusOnPublish(user: AuthUser, category: EventCategory) {
    return NEEDS_REVIEW.includes(category) && !(await this.staff.isStaff(user)) ? 'PENDING_REVIEW' : 'PUBLISHED';
  }

  // ── create / update / delete ───────────────────────────────────────────────────────────────────────

  async create(user: AuthUser, dto: EventDto) {
    if (!dto.title || !dto.category || !dto.startsAt || !dto.endsAt) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'MISSING_FIELDS', 'Title, category, start and end are required');
    }
    const starts = new Date(dto.startsAt), ends = new Date(dto.endsAt);
    this.validateTimes(starts, ends, dto.sessions);
    this.checkZone(dto.timeZone);
    if (dto.calendarDayId && !(await this.prisma.calendarDay.findUnique({ where: { id: dto.calendarDayId } }))) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'UNKNOWN_CALENDAR_DAY', 'Unknown calendar day');
    }
    const status = dto.publish ? await this.statusOnPublish(user, dto.category) : 'DRAFT';
    const e = await this.prisma.event.create({
      data: {
        organizerProfileId: user.profileId,
        title: dto.title.trim(),
        summary: dto.summary?.trim() ?? '',
        description: dto.description ?? '',
        category: dto.category,
        template: dto.template ?? SUGGESTED_TEMPLATE[dto.category],
        audience: dto.audience ?? 'PUBLIC',
        status,
        startsAt: starts,
        endsAt: ends,
        timeZone: dto.timeZone ?? 'UTC',
        country: dto.country?.toUpperCase(),
        city: dto.city,
        venue: dto.venue,
        venuePublic: dto.venuePublic ?? true,
        onlineUrl: dto.onlineUrl,
        registration: dto.registration ?? 'NONE',
        registrationUrl: dto.registrationUrl,
        capacity: dto.capacity,
        contact: dto.contact,
        hostName: dto.hostName,
        speakers: dto.speakers as unknown as Prisma.InputJsonValue,
        faq: dto.faq as unknown as Prisma.InputJsonValue,
        calendarDayId: dto.calendarDayId,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        sessions: { create: (dto.sessions ?? []).map((s) => ({ ...s, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) })) },
      },
    });
    await this.audit.log(user.userId, 'event.create', 'event', e.id, { status, category: e.category });
    return this.get(user, e.id);
  }

  async update(user: AuthUser, id: string, dto: EventDto) {
    const before = await this.mine(user, id);
    const starts = dto.startsAt ? new Date(dto.startsAt) : before.startsAt;
    const ends = dto.endsAt ? new Date(dto.endsAt) : before.endsAt;
    this.validateTimes(starts, ends, dto.sessions);
    this.checkZone(dto.timeZone);
    const category = dto.category ?? before.category;
    let status = before.status;
    if (dto.publish === true && (before.status === 'DRAFT' || before.status === 'REJECTED')) status = await this.statusOnPublish(user, category);
    if (dto.publish === false && before.status !== 'CANCELLED') status = 'DRAFT';
    // Changing to a category that needs review sends a published event back to review.
    if (status === 'PUBLISHED' && dto.category && dto.category !== before.category && NEEDS_REVIEW.includes(dto.category)) {
      status = await this.statusOnPublish(user, dto.category);
    }
    const { publish: _p, sessions, ...fields } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          ...fields,
          country: dto.country?.toUpperCase(),
          startsAt: starts,
          endsAt: ends,
          status,
          speakers: dto.speakers as unknown as Prisma.InputJsonValue,
          faq: dto.faq as unknown as Prisma.InputJsonValue,
          publishedAt: status === 'PUBLISHED' && !before.publishedAt ? new Date() : undefined,
        },
      });
      if (sessions) {
        await tx.eventSession.deleteMany({ where: { eventId: id } });
        await tx.eventSession.createMany({ data: sessions.map((s) => ({ ...s, eventId: id, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) })) });
      }
    });
    await this.audit.log(user.userId, 'event.update', 'event', id, { fields: Object.keys(dto), status });
    // Participants hear about a changed time or place of a published event.
    const moved = starts.getTime() !== before.startsAt.getTime() || ends.getTime() !== before.endsAt.getTime() || (dto.venue !== undefined && dto.venue !== before.venue);
    if (before.status === 'PUBLISHED' && moved) await this.notifyAttendees(user, id, 'EVENT_UPDATED', before.title);
    return this.get(user, id);
  }

  async cancel(user: AuthUser, id: string) {
    const e = await this.mine(user, id);
    await this.prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
    await this.audit.log(user.userId, 'event.cancel', 'event', id);
    if (e.status === 'PUBLISHED') await this.notifyAttendees(user, id, 'EVENT_CANCELLED', e.title);
    return this.get(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const e = await this.mine(user, id);
    if (e.status === 'PUBLISHED') await this.notifyAttendees(user, id, 'EVENT_CANCELLED', e.title);
    await this.prisma.event.delete({ where: { id } });
    await this.audit.log(user.userId, 'event.delete', 'event', id, { title: e.title });
    return { deleted: true };
  }

  private async notifyAttendees(user: AuthUser, eventId: string, type: string, title: string) {
    const rows = await this.prisma.eventAttendee.findMany({ where: { eventId }, select: { profileId: true } });
    for (const r of rows) {
      await this.notifications.notify({
        recipientProfileId: r.profileId,
        actorProfileId: user.profileId,
        category: 'EVENTS',
        type,
        entityType: 'event',
        entityId: eventId,
        data: { title },
        dedupeKey: `${type}:${eventId}`,
      });
    }
  }

  // ── read ───────────────────────────────────────────────────────────────────────────────────────────

  async get(user: AuthUser | null, id: string) {
    const e = await this.load(id);
    const v = await this.viewer(user);
    if (!this.canView(v, e)) throw notFound();
    return this.detail(e, v);
  }

  /** Public page for a public event (shareable link, no account needed). */
  async getPublic(id: string) {
    const e = await this.load(id);
    if (e.audience !== 'PUBLIC' || (e.status !== 'PUBLISHED' && e.status !== 'CANCELLED')) throw notFound();
    return this.detail(e, await this.viewer(null));
  }

  async list(user: AuthUser, q: { scope?: string; category?: string; country?: string; page?: number }) {
    const v = await this.viewer(user);
    const page = Math.max(0, q.page ?? 0);
    const now = new Date();
    const visible: Prisma.EventWhereInput = v.staff
      ? {}
      : {
          organizerProfileId: { notIn: [...v.blocked] },
          OR: [
            { status: { in: ['PUBLISHED', 'CANCELLED'] }, audience: 'PUBLIC' },
            { status: { in: ['PUBLISHED', 'CANCELLED'] }, audience: 'FRIENDS', organizerProfileId: { in: [...v.friends] } },
            { organizerProfileId: user.profileId },
          ],
        };
    const filters: Prisma.EventWhereInput = {
      ...(q.category ? { category: q.category as EventCategory } : {}),
      ...(q.country ? { country: q.country.toUpperCase() } : {}),
    };
    let where: Prisma.EventWhereInput;
    let orderBy: Prisma.EventOrderByWithRelationInput[] = [{ startsAt: 'asc' }];
    switch (q.scope) {
      case 'mine':
        where = { organizerProfileId: user.profileId, ...filters };
        orderBy = [{ startsAt: 'desc' }];
        break;
      case 'saved':
        where = { AND: [visible, filters, { saves: { some: { profileId: user.profileId } } }] };
        break;
      case 'registered':
        where = { AND: [visible, filters, { attendees: { some: { profileId: user.profileId } } }] };
        break;
      case 'past':
        where = { AND: [visible, filters, { endsAt: { lt: now }, status: 'PUBLISHED' }] };
        orderBy = [{ startsAt: 'desc' }];
        break;
      case 'review':
        if (!v.staff) throw new AppError(HttpStatus.FORBIDDEN, 'STAFF_ONLY', 'Only reviewers can see the review queue');
        where = { status: 'PENDING_REVIEW' };
        break;
      default: // upcoming: published, not over yet; featured first
        where = { AND: [visible, filters, { endsAt: { gte: now }, status: 'PUBLISHED' }] };
        orderBy = [{ featuredAt: { sort: 'desc', nulls: 'last' } }, { startsAt: 'asc' }];
    }
    const [total, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        include: { organizer: true, sessions: { take: 0 }, _count: { select: { attendees: true } } },
        orderBy,
        skip: page * PAGE,
        take: PAGE,
      }),
    ]);
    const ids = rows.map((r) => r.id);
    const [saves, regs] = await Promise.all([
      this.prisma.eventSave.findMany({ where: { profileId: user.profileId, eventId: { in: ids } }, select: { eventId: true } }),
      this.prisma.eventAttendee.findMany({ where: { profileId: user.profileId, eventId: { in: ids } }, select: { eventId: true } }),
    ]);
    const s = new Set(saves.map((x) => x.eventId)), r = new Set(regs.map((x) => x.eventId));
    return {
      total,
      page,
      staff: v.staff,
      items: (rows as Loaded[]).filter((e) => this.canView(v, e)).map((e) => this.card(e, v, { saved: s.has(e.id), registered: r.has(e.id) })),
    };
  }

  // ── participation ──────────────────────────────────────────────────────────────────────────────────

  async save(user: AuthUser, id: string, on: boolean) {
    await this.get(user, id); // visibility check
    if (on) {
      await this.prisma.eventSave.upsert({ where: { eventId_profileId: { eventId: id, profileId: user.profileId } }, create: { eventId: id, profileId: user.profileId }, update: {} });
    } else {
      await this.prisma.eventSave.deleteMany({ where: { eventId: id, profileId: user.profileId } });
    }
    return { saved: on };
  }

  async register(user: AuthUser, id: string) {
    const e = await this.load(id);
    const v = await this.viewer(user);
    if (!this.canView(v, e)) throw notFound();
    if (e.status !== 'PUBLISHED') throw new AppError(HttpStatus.CONFLICT, 'NOT_OPEN', 'Registration is not open for this event');
    if (e.registration !== 'RSVP') throw new AppError(HttpStatus.BAD_REQUEST, 'NO_RSVP', 'This event has no registration on EZIDINET');
    if (e.endsAt < new Date()) throw new AppError(HttpStatus.CONFLICT, 'EVENT_OVER', 'This event is over');
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`event:${id}`}))`;
      const exists = await tx.eventAttendee.findUnique({ where: { eventId_profileId: { eventId: id, profileId: user.profileId } } });
      if (exists) return;
      if (e.capacity) {
        const n = await tx.eventAttendee.count({ where: { eventId: id } });
        if (n >= e.capacity) throw new AppError(HttpStatus.CONFLICT, 'FULL', 'This event is full');
      }
      await tx.eventAttendee.create({ data: { eventId: id, profileId: user.profileId } });
    });
    await this.audit.log(user.userId, 'event.register', 'event', id);
    await this.notifications.notify({
      recipientProfileId: e.organizerProfileId,
      actorProfileId: user.profileId,
      category: 'EVENTS',
      type: 'EVENT_REGISTRATION',
      entityType: 'event',
      entityId: id,
      data: { title: e.title },
      dedupeKey: `evreg:${id}:${user.profileId}`,
    });
    return this.get(user, id);
  }

  async unregister(user: AuthUser, id: string) {
    await this.prisma.eventAttendee.deleteMany({ where: { eventId: id, profileId: user.profileId } });
    await this.audit.log(user.userId, 'event.unregister', 'event', id);
    return this.get(user, id);
  }

  /** Participant list — only for the organizer and staff (protects participants' data). */
  async attendees(user: AuthUser, id: string) {
    await this.mine(user, id);
    const rows = await this.prisma.eventAttendee.findMany({ where: { eventId: id }, include: { profile: true }, orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({ ...personSummary(r.profile, null), registeredAt: r.createdAt }));
  }

  // ── staff ──────────────────────────────────────────────────────────────────────────────────────────

  async review(user: AuthUser, id: string, approve: boolean, note?: string) {
    await this.staff.assertStaff(user);
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw notFound();
    if (e.status !== 'PENDING_REVIEW') throw new AppError(HttpStatus.CONFLICT, 'NOT_IN_REVIEW', 'This event is not waiting for review');
    await this.prisma.event.update({
      where: { id },
      data: { status: approve ? 'PUBLISHED' : 'REJECTED', reviewNote: note ?? null, publishedAt: approve ? new Date() : null },
    });
    await this.audit.log(user.userId, approve ? 'event.approve' : 'event.reject', 'event', id, { note });
    await this.notifications.notify({
      recipientProfileId: e.organizerProfileId,
      actorProfileId: null,
      category: 'EVENTS',
      type: approve ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
      entityType: 'event',
      entityId: id,
      data: { title: e.title, note: note ?? null },
      dedupeKey: `evreview:${id}`,
    });
    return this.get(user, id);
  }

  async feature(user: AuthUser, id: string, on: boolean) {
    await this.staff.assertStaff(user);
    await this.prisma.event.update({ where: { id }, data: { featuredAt: on ? new Date() : null } });
    await this.audit.log(user.userId, on ? 'event.feature' : 'event.unfeature', 'event', id);
    return this.get(user, id);
  }
}
