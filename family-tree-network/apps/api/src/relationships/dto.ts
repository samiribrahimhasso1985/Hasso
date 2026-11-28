import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';

const VIS = ['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE'];

export class RelationshipAttributesDto {
  @IsOptional() @IsIn(['BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER', 'GUARDIAN']) parentSubtype?: 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP' | 'FOSTER' | 'GUARDIAN';
  @IsOptional() @IsIn(['FULL', 'HALF', 'STEP', 'ADOPTIVE', 'UNSPECIFIED']) siblingSubtype?: 'FULL' | 'HALF' | 'STEP' | 'ADOPTIVE' | 'UNSPECIFIED';
  @IsOptional() @IsIn(['PATERNAL', 'MATERNAL', 'UNSPECIFIED']) lineageSide?: 'PATERNAL' | 'MATERNAL' | 'UNSPECIFIED';
  @IsOptional() @IsDateString({ strict: true }) startDate?: string;
  @IsOptional() @IsDateString({ strict: true }) endDate?: string;
  @IsOptional() @IsIn(['DIVORCE', 'DEATH', 'SEPARATION', 'ANNULMENT']) endReason?: 'DIVORCE' | 'DEATH' | 'SEPARATION' | 'ANNULMENT';
  @IsOptional() @IsString() @MaxLength(60) customLabel?: string;
  @IsOptional() @IsIn(['FAMILY', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL']) customCategory?: 'FAMILY' | 'FRIENDSHIP' | 'PROFESSIONAL' | 'SOCIAL';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** "<relatedPersonId> is the <type> of <personId>" */
export class CreateRelationshipDto {
  @IsUUID() personId: string;
  @IsUUID() relatedPersonId: string;
  @IsString() @Matches(/^[A-Za-z_]{2,40}$/) type: string;
  @IsOptional() @IsIn(VIS) visibility?: 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
  @IsOptional() @ValidateNested() @Type(() => RelationshipAttributesDto) attributes?: RelationshipAttributesDto;
}

export class DecisionDto {
  @IsIn(['CONFIRM', 'REJECT', 'DISPUTE']) decision: 'CONFIRM' | 'REJECT' | 'DISPUTE';
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

export class UpdateRelationshipDto {
  @IsOptional() @IsIn(VIS) visibility?: 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsDateString({ strict: true }) startDate?: string;
  @IsOptional() @IsDateString({ strict: true }) endDate?: string;
  @IsOptional() @IsIn(['DIVORCE', 'DEATH', 'SEPARATION', 'ANNULMENT']) endReason?: 'DIVORCE' | 'DEATH' | 'SEPARATION' | 'ANNULMENT';
}
