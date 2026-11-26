import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength, MinLength } from 'class-validator';

export class CreateManagedProfileDto {
  @IsString() @MinLength(1) @MaxLength(80) displayName: string;
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE', 'UNSPECIFIED']) gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  @IsOptional() @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @IsDateString({ strict: true }) deathDate?: string;
  @IsOptional() @IsBoolean() isMinor?: boolean;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) displayName?: string;
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE', 'UNSPECIFIED']) gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  @IsOptional() @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @IsOptional() @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsBoolean() searchable?: boolean;
}

export class PrivacyDto {
  @IsIn(['BIRTH_DATE', 'COUNTRY', 'CITY', 'BIO', 'LANGUAGES']) field: 'BIRTH_DATE' | 'COUNTRY' | 'CITY' | 'BIO' | 'LANGUAGES';
  @IsIn(['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE']) visibility: 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
}

export class AddStewardDto {
  /** Profile id of the (claimed) person who becomes co-steward. */
  @IsUUID() profileId: string;
}

export class BlockDto {
  @IsUUID() profileId: string;
}
