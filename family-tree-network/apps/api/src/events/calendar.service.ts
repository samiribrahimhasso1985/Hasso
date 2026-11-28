import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, holidayPhase, localDate, ymdOf } from './calendar-rules';
import type { CalendarDateDto, CalendarDayDto } from './dto';
import { StaffService } from './staff';

const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'CALENDAR_DAY_NOT_FOUND', 'Calendar day not found');

/**
 * ÊZÎDÎ Calendar: definitions of holy days, fasts, pilgrimages and remembrance days, and their verified dates.
 * Members see only reviewed (published) days and VERIFIED dates. Nothing is ever deleted when a date has passed.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly staff: StaffService,
  ) {}

  private dateDto(d: { id: string; startDate: Date; endDate: Date; traditionalDate: string | null; verification: string; note: string | null }) {
    return { id: d.id, startDate: ymdOf(d.startDate), endDate: ymdOf(d.endDate), traditionalDate: d.traditionalDate, verification: d.verification, note: d.note };
  }

  /** Holy-day cards to show now: the day before and on the day(s) only, in the viewer's time zone. */
  async today(timeZone = 'UTC', at = new Date()) {
    const today = localDate(at, timeZone);
    const tomorrow = addDays(today, 1);
    const rows = await this.prisma.calendarDate.findMany({
      where: {
        verification: 'VERIFIED',
        day: { published: true },
        startDate: { lte: new Date(`${tomorrow}T00:00:00Z`) },
        endDate: { gte: new Date(`${today}T00:00:00Z`) },
      },
      include: { day: true },
      orderBy: { startDate: 'asc' },
    });
    return {
      today,
      timeZone,
      items: rows
        .map((r) => ({ phase: holidayPhase(ymdOf(r.startDate), ymdOf(r.endDate), today), day: this.dayDto(r.day), date: this.dateDto(r) }))
        .filter((x) => x.phase),
    };
  }

  private dayDto(d: { id: string; slug: string; category: string; names: unknown; summary: unknown; description: unknown; region: string | null; tradition: string | null; sources: string[]; template: string; published: boolean }) {
    return { id: d.id, slug: d.slug, category: d.category, names: d.names, summary: d.summary, description: d.description, region: d.region, tradition: d.tradition, sources: d.sources, template: d.template, published: d.published };
  }

  /** The calendar of a year: published days with their verified dates (staff also see drafts and unverified dates). */
  async year(user: AuthUser | null, year: number) {
    const staff = await this.staff.isStaff(user);
    const from = new Date(`${year}-01-01T00:00:00Z`), to = new Date(`${year}-12-31T00:00:00Z`);
    const days = await this.prisma.calendarDay.findMany({
      where: staff ? {} : { published: true },
      include: { dates: { where: { startDate: { gte: from, lte: to }, ...(staff ? {} : { verification: 'VERIFIED' }) }, orderBy: { startDate: 'asc' } } },
      orderBy: { slug: 'asc' },
    });
    return {
      year,
      staff,
      days: days
        .filter((d) => staff || d.dates.length)
        .map((d) => ({ ...this.dayDto(d), dates: d.dates.map((x) => this.dateDto(x)) }))
        .sort((a, b) => (a.dates[0]?.startDate ?? '9999').localeCompare(b.dates[0]?.startDate ?? '9999')),
    };
  }

  async day(user: AuthUser | null, slug: string) {
    const staff = await this.staff.isStaff(user);
    const d = await this.prisma.calendarDay.findUnique({
      where: { slug },
      include: { dates: { where: staff ? {} : { verification: 'VERIFIED' }, orderBy: { startDate: 'asc' } } },
    });
    if (!d || (!d.published && !staff)) throw notFound();
    // Community events that celebrate this day (public, published, not over): their own dates, never mixed with the holy day.
    const events = await this.prisma.event.findMany({
      where: { calendarDayId: d.id, status: 'PUBLISHED', audience: 'PUBLIC', endsAt: { gte: new Date() } },
      select: { id: true, title: true, startsAt: true, endsAt: true, city: true, country: true, template: true },
      orderBy: { startsAt: 'asc' },
      take: 20,
    });
    return { ...this.dayDto(d), dates: d.dates.map((x) => this.dateDto(x)), events };
  }

  // ── staff (calendar editors) ───────────────────────────────────────────────────────────────────────

  async createDay(user: AuthUser, dto: CalendarDayDto) {
    await this.staff.assertStaff(user);
    if (!dto.slug || !dto.category || !dto.names || !dto.template) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'MISSING_FIELDS', 'Slug, category, names (ku, ar, de, en) and template are required');
    }
    if (await this.prisma.calendarDay.findUnique({ where: { slug: dto.slug } })) throw new AppError(HttpStatus.CONFLICT, 'SLUG_TAKEN', 'This short name is already used');
    const d = await this.prisma.calendarDay.create({
      data: {
        slug: dto.slug,
        category: dto.category,
        names: dto.names as unknown as Prisma.InputJsonValue,
        summary: dto.summary as unknown as Prisma.InputJsonValue,
        description: dto.description as unknown as Prisma.InputJsonValue,
        region: dto.region,
        tradition: dto.tradition,
        sources: dto.sources ?? [],
        template: dto.template,
        published: dto.published ?? false,
      },
    });
    await this.audit.log(user.userId, 'calendar.day.create', 'calendar_day', d.id, { slug: d.slug });
    return this.day(user, d.slug);
  }

  async updateDay(user: AuthUser, id: string, dto: CalendarDayDto) {
    await this.staff.assertStaff(user);
    const d = await this.prisma.calendarDay.findUnique({ where: { id } });
    if (!d) throw notFound();
    const { slug: _s, ...rest } = dto;
    await this.prisma.calendarDay.update({
      where: { id },
      data: {
        ...rest,
        names: dto.names as unknown as Prisma.InputJsonValue,
        summary: dto.summary as unknown as Prisma.InputJsonValue,
        description: dto.description as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.log(user.userId, 'calendar.day.update', 'calendar_day', id, { fields: Object.keys(dto) });
    return this.day(user, d.slug);
  }

  /** Adds or changes the date of a day (a changed date is unverified again until confirmed). */
  async setDate(user: AuthUser, dayId: string, dto: CalendarDateDto, dateId?: string) {
    await this.staff.assertStaff(user);
    const d = await this.prisma.calendarDay.findUnique({ where: { id: dayId } });
    if (!d) throw notFound();
    if (dto.endDate < dto.startDate) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_DATES', 'The last day must not be before the first day');
    const data = {
      startDate: new Date(`${dto.startDate}T00:00:00Z`),
      endDate: new Date(`${dto.endDate}T00:00:00Z`),
      traditionalDate: dto.traditionalDate,
      note: dto.note,
      verification: 'UNVERIFIED' as const,
      verifiedByUserId: null,
      verifiedAt: null,
    };
    try {
      const row = dateId
        ? await this.prisma.calendarDate.update({ where: { id: dateId, dayId }, data })
        : await this.prisma.calendarDate.create({ data: { ...data, dayId } });
      await this.audit.log(user.userId, dateId ? 'calendar.date.update' : 'calendar.date.create', 'calendar_date', row.id, { dayId, ...dto });
      return this.dateDto(row);
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new AppError(HttpStatus.CONFLICT, 'DATE_EXISTS', 'This day already has an entry starting on that date');
      if ((e as { code?: string }).code === 'P2025') throw new AppError(HttpStatus.NOT_FOUND, 'DATE_NOT_FOUND', 'Date not found');
      throw e;
    }
  }

  async verify(user: AuthUser, dateId: string, verification: 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED') {
    await this.staff.assertStaff(user);
    const row = await this.prisma.calendarDate
      .update({ where: { id: dateId }, data: { verification, verifiedByUserId: verification === 'VERIFIED' ? user.userId : null, verifiedAt: verification === 'VERIFIED' ? new Date() : null } })
      .catch(() => null);
    if (!row) throw new AppError(HttpStatus.NOT_FOUND, 'DATE_NOT_FOUND', 'Date not found');
    await this.audit.log(user.userId, 'calendar.date.verify', 'calendar_date', dateId, { verification });
    return this.dateDto(row);
  }

  async deleteDate(user: AuthUser, dateId: string) {
    await this.staff.assertStaff(user);
    const r = await this.prisma.calendarDate.deleteMany({ where: { id: dateId } });
    if (!r.count) throw new AppError(HttpStatus.NOT_FOUND, 'DATE_NOT_FOUND', 'Date not found');
    await this.audit.log(user.userId, 'calendar.date.delete', 'calendar_date', dateId);
    return { deleted: true };
  }
}
