import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { NotificationCategory } from '@prisma/client';
import { CATEGORIES } from './notifications.service';

export class NotificationPrefsDto {
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsIn(CATEGORIES, { each: true }) mutedCategories?: NotificationCategory[];
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(1439) quietStart?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0) @Max(1439) quietEnd?: number | null;
  @IsOptional() @IsString() @MaxLength(40) timeZone?: string;
  /** Do not disturb for the next N minutes (null ends it). */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1) @Max(7 * 24 * 60) dndMinutes?: number | null;
}
