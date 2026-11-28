import { Controller, Get, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type { Locale, RelationshipCategory } from '@ftn/relationship-engine';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { ReqLocale } from '../common/locale';
import { GraphService } from './graph.service';

const CATEGORIES = ['FAMILY', 'UNION', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL', 'CUSTOM'];
const toList = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.length ? value.split(',').map((s) => s.trim().toUpperCase()) : undefined;
const toBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

class EgoQuery {
  @IsOptional()
  @IsUUID()
  center?: string;

  /** Express kinship/generations relative to this person (e.g. the focus of the current view). */
  @IsOptional()
  @IsUUID()
  relativeTo?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(4)
  depth = 2;

  @IsOptional()
  @Transform(toList)
  @IsIn(CATEGORIES, { each: true })
  categories?: RelationshipCategory[];

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includePending = true;

  @IsOptional()
  @IsIn(['en', 'de', 'ar', 'ku'])
  locale?: string;
}

class PathQuery {
  @IsUUID()
  from: string;

  @IsUUID()
  to: string;

  @IsOptional()
  @Transform(toList)
  @IsIn(CATEGORIES, { each: true })
  categories?: RelationshipCategory[];

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includePending = false;

  @IsOptional()
  @IsIn(['en', 'de', 'ar', 'ku'])
  locale?: string;
}

@Controller('graph')
export class GraphController {
  constructor(private readonly graph: GraphService) {}

  @Get('ego')
  ego(@AuthUserParam() user: AuthUser, @Query() q: EgoQuery, @ReqLocale() locale: Locale) {
    return this.graph.ego(user, q.center ?? user.profileId, {
      depth: q.depth,
      categories: q.categories,
      includePending: q.includePending,
      locale,
      relativeTo: q.relativeTo,
    });
  }

  @Get('path')
  path(@AuthUserParam() user: AuthUser, @Query() q: PathQuery, @ReqLocale() locale: Locale) {
    return this.graph.path(user, q.from, q.to, { categories: q.categories, includePending: q.includePending, locale });
  }
}
