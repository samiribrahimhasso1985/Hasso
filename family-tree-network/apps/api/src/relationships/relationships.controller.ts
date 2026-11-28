import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { RELATIONSHIP_TYPES, type Locale } from '@ftn/relationship-engine';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { ReqLocale } from '../common/locale';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRelationshipDto, DecisionDto, UpdateRelationshipDto } from './dto';
import { RelationshipsService } from './relationships.service';

@Controller()
export class RelationshipsController {
  constructor(
    private readonly rels: RelationshipsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Enabled relationship types with labels in the requested language. */
  @Get('relationship-types')
  async types(@ReqLocale() locale: Locale) {
    const rows = await this.prisma.relationshipType.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } });
    return rows.map((t) => {
      const def = RELATIONSHIP_TYPES.find((d) => d.key === t.key);
      return {
        key: t.key,
        category: t.category,
        directionality: t.directionality,
        sensitive: t.sensitive,
        defaultVisibility: t.defaultVisibility,
        label: def?.labels[locale] ?? null,
        inverseLabel: def?.inverseLabels[locale] ?? null,
      };
    });
  }

  @Post('relationships')
  create(@AuthUserParam() user: AuthUser, @Body() dto: CreateRelationshipDto, @ReqLocale() locale: Locale) {
    return this.rels.create(user, dto, locale);
  }

  @Get('relationships/awaiting-me')
  awaiting(@AuthUserParam() user: AuthUser, @ReqLocale() locale: Locale) {
    return this.rels.awaitingMe(user, locale);
  }

  @Get('relationships/:id')
  get(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ReqLocale() locale: Locale) {
    return this.rels.get(user, id, locale);
  }

  @Post('relationships/:id/decision')
  decide(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @ReqLocale() locale: Locale) {
    return this.rels.decide(user, id, dto, locale);
  }

  @Patch('relationships/:id')
  update(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRelationshipDto, @ReqLocale() locale: Locale) {
    return this.rels.update(user, id, dto, locale);
  }

  @Delete('relationships/:id')
  remove(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rels.remove(user, id);
  }
}
