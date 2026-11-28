import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CalendarCategory, EventAudience, EventCategory, EventTemplate, RegistrationMode, SessionStatus } from '@prisma/client';

export const EVENT_CATEGORIES: EventCategory[] = [
  'CULTURAL_FESTIVAL', 'RELIGIOUS_CELEBRATION', 'COMMUNITY_GATHERING', 'HERITAGE_EXHIBITION', 'MUSIC', 'EDUCATIONAL', 'YOUTH', 'CHARITY', 'MEMORIAL', 'ONLINE', 'INTERNATIONAL_MEETUP',
];
export const TEMPLATES: EventTemplate[] = ['RELIGIOUS', 'CULTURAL', 'HERITAGE', 'COMMUNITY', 'MEMORIAL', 'MUSIC', 'INTERNATIONAL', 'ONLINE', 'LOCAL'];
export const CALENDAR_CATEGORIES: CalendarCategory[] = ['RELIGIOUS_HOLIDAY', 'FASTING', 'CULTURAL', 'PILGRIMAGE', 'HERITAGE', 'REMEMBRANCE', 'COMMUNITY', 'LOCAL_TRADITION'];
const URL_OPTS = { protocols: ['https'], require_protocol: true };

export class SpeakerDto {
  @IsString() @Length(1, 120) name: string;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
}

export class FaqDto {
  @IsString() @Length(1, 300) q: string;
  @IsString() @Length(1, 1500) a: string;
}

export class SessionDto {
  @IsString() @Length(1, 140) title: string;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsOptional() @IsString() @MaxLength(80) stage?: string;
  @IsOptional() @IsString() @MaxLength(120) host?: string;
  @IsOptional() @IsString() @MaxLength(60) kind?: string;
  @IsOptional() @IsIn(['SCHEDULED', 'LIVE', 'DONE', 'CANCELLED']) status?: SessionStatus;
}

/** One form for every kind of event; a missing template is suggested from the category. */
export class EventDto {
  @IsOptional() @IsString() @Length(3, 140) title?: string;
  @IsOptional() @IsString() @MaxLength(300) summary?: string;
  @IsOptional() @IsString() @MaxLength(8000) description?: string;
  @IsOptional() @IsIn(EVENT_CATEGORIES) category?: EventCategory;
  @IsOptional() @IsIn(TEMPLATES) template?: EventTemplate;
  @IsOptional() @IsIn(['PUBLIC', 'FRIENDS', 'PRIVATE']) audience?: EventAudience;
  /** true = publish (or send to review when the category needs it); false = keep as draft. */
  @IsOptional() @IsBoolean() publish?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() @MaxLength(40) timeZone?: string;
  @IsOptional() @Matches(/^[A-Za-z]{2}$/) country?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(200) venue?: string;
  @IsOptional() @IsBoolean() venuePublic?: boolean;
  @IsOptional() @IsUrl(URL_OPTS) @MaxLength(300) onlineUrl?: string;
  @IsOptional() @IsIn(['NONE', 'RSVP', 'EXTERNAL']) registration?: RegistrationMode;
  @IsOptional() @IsUrl(URL_OPTS) @MaxLength(300) registrationUrl?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) capacity?: number;
  @IsOptional() @IsString() @MaxLength(200) contact?: string;
  @IsOptional() @IsString() @MaxLength(120) hostName?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SpeakerDto) speakers?: SpeakerDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => FaqDto) faq?: FaqDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => SessionDto) sessions?: SessionDto[];
  @IsOptional() @IsUUID() calendarDayId?: string;
}

export class ReviewDto {
  @IsBoolean() approve: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class NamesDto {
  @IsString() @Length(1, 120) ku: string;
  @IsString() @Length(1, 120) ar: string;
  @IsString() @Length(1, 120) de: string;
  @IsString() @Length(1, 120) en: string;
}

export class TextsDto {
  @IsOptional() @IsString() @MaxLength(2000) ku?: string;
  @IsOptional() @IsString() @MaxLength(2000) ar?: string;
  @IsOptional() @IsString() @MaxLength(2000) de?: string;
  @IsOptional() @IsString() @MaxLength(2000) en?: string;
}

export class CalendarDayDto {
  @IsOptional() @Matches(/^[a-z0-9-]{2,60}$/) slug?: string;
  @IsOptional() @IsIn(CALENDAR_CATEGORIES) category?: CalendarCategory;
  @IsOptional() @ValidateNested() @Type(() => NamesDto) names?: NamesDto;
  @IsOptional() @ValidateNested() @Type(() => TextsDto) summary?: TextsDto;
  @IsOptional() @ValidateNested() @Type(() => TextsDto) description?: TextsDto;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
  @IsOptional() @IsString() @MaxLength(200) tradition?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(300, { each: true }) sources?: string[];
  @IsOptional() @IsIn(TEMPLATES) template?: EventTemplate;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CalendarDateDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate: string;
  @IsOptional() @IsString() @MaxLength(120) traditionalDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class VerifyDto {
  @IsIn(['UNVERIFIED', 'VERIFIED', 'DISPUTED']) verification: 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED';
}
