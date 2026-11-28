import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ProfileField, Visibility } from '@prisma/client';
import { GraphIndex, type ViewerContext } from '@ftn/relationship-engine';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { GraphLoader, type Loaded } from '../graph/graph-loader.service';
import { canSeePerson, personSummary } from '../graph/present';
import { PrismaService } from '../prisma/prisma.service';
import type { AddStewardDto, CreateManagedProfileDto, PrivacyDto, UpdateProfileDto } from './dto';

/** Defaults when the person has not chosen (data minimisation: personal details are not public). */
export const FIELD_DEFAULTS: Record<ProfileField, Visibility> = {
  BIRTH_DATE: 'FAMILY',
  COUNTRY: 'PUBLIC',
  CITY: 'FAMILY',
  BIO: 'PUBLIC',
  LANGUAGES: 'PUBLIC',
};
const RANK: Record<Visibility, number> = { PUBLIC: 0, NETWORK: 1, FAMILY: 2, PRIVATE: 3 };
const asDate = (s?: string) => (s ? new Date(`${s}T00:00:00Z`) : undefined);
const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found');

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: GraphLoader,
    private readonly audit: AuditService,
  ) {}

  private async context(user: AuthUser): Promise<{ ctx: ViewerContext; loaded: Loaded }> {
    const loaded: Loaded = { index: new GraphIndex(), profiles: new Map() };
    const ctx = await this.loader.viewer(user, loaded);
    return { ctx, loaded };
  }

  private canManage(user: AuthUser, p: { userId: string | null; stewards: { userId: string }[] }) {
    return p.userId === user.userId || (!p.userId && p.stewards.some((s) => s.userId === user.userId));
  }

  /** Profile with per-field privacy applied for this viewer. */
  async get(user: AuthUser, id: string) {
    const p = await this.prisma.profile.findUnique({ where: { id }, include: { stewards: true, privacy: true } });
    if (!p) throw notFound();
    const { ctx } = await this.context(user);
    const stewardUserIds = p.stewards.map((s) => s.userId);
    if (!canSeePerson(ctx, { ...p, stewardUserIds })) throw notFound();
    const own = this.canManage(user, p);
    const level = (field: ProfileField): Visibility => {
      let v = p.privacy.find((x) => x.field === field)?.visibility ?? FIELD_DEFAULTS[field];
      if (p.isMinor && RANK[v] < RANK.FAMILY) v = 'FAMILY'; // minors: never beyond family
      return v;
    };
    const allowed = (field: ProfileField) => {
      if (own) return true;
      switch (level(field)) {
        case 'PUBLIC':
          return true;
        case 'NETWORK':
          return ctx.networkPersonIds.has(p.id) || ctx.familyPersonIds.has(p.id);
        case 'FAMILY':
          return ctx.familyPersonIds.has(p.id);
        default:
          return false;
      }
    };
    return {
      ...personSummary(p, ctx, own),
      photoVisibility: own ? (await this.prisma.profilePhoto.findUnique({ where: { profileId: p.id }, select: { visibility: true } }))?.visibility ?? null : undefined,
      fullName: own || ctx.familyPersonIds.has(p.id) ? p.fullName : null,
      birthDate: allowed('BIRTH_DATE') ? p.birthDate?.toISOString().slice(0, 10) ?? null : null,
      deathDate: p.deathDate?.toISOString().slice(0, 10) ?? null,
      country: allowed('COUNTRY') ? p.country : null,
      city: allowed('CITY') ? p.city : null,
      bio: allowed('BIO') ? p.bio : null,
      languages: allowed('LANGUAGES') ? p.languages : [],
      canManage: own,
      privacy: own ? Object.fromEntries((Object.keys(FIELD_DEFAULTS) as ProfileField[]).map((f) => [f, level(f)])) : undefined,
      stewards: own ? stewardUserIds.length : undefined,
    };
  }

  /** Name search: searchable adults, plus the viewer's own family (which may include minors). */
  async search(user: AuthUser, q: string) {
    const term = q.trim();
    if (term.length < 2) return [];
    const { ctx } = await this.context(user);
    const rows = await this.prisma.profile.findMany({
      where: {
        displayName: { contains: term, mode: 'insensitive' },
        OR: [{ searchable: true, isMinor: false }, { id: { in: [...ctx.familyPersonIds] } }, { stewards: { some: { userId: user.userId } } }],
        id: { notIn: [...ctx.blockedPersonIds] },
      },
      include: { stewards: true },
      orderBy: { displayName: 'asc' },
      take: 20,
    });
    return rows
      .filter((p) => canSeePerson(ctx, { ...p, stewardUserIds: p.stewards.map((s) => s.userId) }))
      .map((p) => ({ ...personSummary(p, ctx), inMyFamily: ctx.familyPersonIds.has(p.id), connected: ctx.networkPersonIds.has(p.id) }));
  }

  /** Profiles this user manages (own + stewarded). */
  async managed(user: AuthUser) {
    const rows = await this.prisma.profile.findMany({
      where: { OR: [{ userId: user.userId }, { stewards: { some: { userId: user.userId } } }] },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((p) => personSummary(p, null, true));
  }

  /**
   * Creates a profile for someone without an account (a child, a deceased ancestor).
   * The creator becomes steward; a minor profile is protected and never searchable.
   */
  async createManaged(user: AuthUser, dto: CreateManagedProfileDto) {
    const isMinor = dto.isMinor ?? false;
    const p = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          displayName: dto.displayName.trim(),
          fullName: dto.fullName,
          gender: dto.gender ?? 'UNSPECIFIED',
          birthDate: asDate(dto.birthDate),
          deathDate: asDate(dto.deathDate),
          isMinor,
          searchable: !isMinor,
          country: dto.country?.toUpperCase(),
          createdById: user.userId,
          stewards: { create: { userId: user.userId, role: isMinor ? 'GUARDIAN' : 'CURATOR' } },
        },
      });
      await this.audit.log(user.userId, 'profile.create_managed', 'profile', created.id, { isMinor }, tx);
      return created;
    });
    return this.get(user, p.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateProfileDto) {
    const p = await this.prisma.profile.findUnique({ where: { id }, include: { stewards: true } });
    if (!p || !this.canManage(user, p)) throw notFound();
    const data: Prisma.ProfileUpdateInput = {
      ...dto,
      country: dto.country?.toUpperCase(),
      birthDate: asDate(dto.birthDate),
      searchable: p.isMinor ? false : dto.searchable,
    };
    await this.prisma.profile.update({ where: { id }, data });
    await this.audit.log(user.userId, 'profile.update', 'profile', id, { fields: Object.keys(dto) });
    return this.get(user, id);
  }

  async setPrivacy(user: AuthUser, id: string, dto: PrivacyDto) {
    const p = await this.prisma.profile.findUnique({ where: { id }, include: { stewards: true } });
    if (!p || !this.canManage(user, p)) throw notFound();
    await this.prisma.privacySetting.upsert({
      where: { profileId_field: { profileId: id, field: dto.field } },
      create: { profileId: id, field: dto.field, visibility: dto.visibility },
      update: { visibility: dto.visibility },
    });
    await this.audit.log(user.userId, 'profile.privacy', 'profile', id, { field: dto.field, visibility: dto.visibility });
    return this.get(user, id);
  }

  /** A steward adds a co-steward (needed so sensitive facts get a second, independent confirmation). */
  async addSteward(user: AuthUser, id: string, dto: AddStewardDto) {
    const p = await this.prisma.profile.findUnique({ where: { id }, include: { stewards: true } });
    if (!p || p.userId || !p.stewards.some((s) => s.userId === user.userId)) throw notFound();
    const target = await this.prisma.profile.findUnique({ where: { id: dto.profileId } });
    if (!target?.userId) throw new AppError(HttpStatus.BAD_REQUEST, 'NOT_A_USER', 'Stewards must have their own account');
    await this.prisma.profileSteward.upsert({
      where: { profileId_userId: { profileId: id, userId: target.userId } },
      create: { profileId: id, userId: target.userId, role: p.isMinor ? 'GUARDIAN' : 'CURATOR' },
      update: {},
    });
    await this.audit.log(user.userId, 'profile.add_steward', 'profile', id, { stewardProfileId: dto.profileId });
    return { ok: true };
  }

  async block(user: AuthUser, profileId: string) {
    if (profileId === user.profileId) throw new AppError(HttpStatus.BAD_REQUEST, 'SELF_BLOCK', 'You cannot block yourself');
    const exists = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!exists) throw notFound();
    await this.prisma.block.upsert({
      where: { blockerUserId_blockedProfileId: { blockerUserId: user.userId, blockedProfileId: profileId } },
      create: { blockerUserId: user.userId, blockedProfileId: profileId },
      update: {},
    });
    await this.audit.log(user.userId, 'block.create', 'profile', profileId);
    return { blocked: true };
  }

  async unblock(user: AuthUser, profileId: string) {
    await this.prisma.block.deleteMany({ where: { blockerUserId: user.userId, blockedProfileId: profileId } });
    await this.audit.log(user.userId, 'block.delete', 'profile', profileId);
    return { blocked: false };
  }
}
