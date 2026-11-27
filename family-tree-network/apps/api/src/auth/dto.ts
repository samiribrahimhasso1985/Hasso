import { Equals, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'UNSPECIFIED'])
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';

  @IsOptional()
  @IsIn(['en', 'de', 'ar', 'ku'])
  locale?: string;

  /** ISO 3166-1 alpha-2, optional; country level only (never a city or address at registration). */
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  /** Required consents — each must be explicitly true. */
  @Equals(true)
  acceptTerms: boolean;

  @Equals(true)
  consentSensitiveData: boolean;

  @Equals(true)
  confirmMinimumAge: boolean;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

export class EmailDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsIn(['en', 'de', 'ar', 'ku'])
  locale?: string;
}

export class TokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(100)
  token: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  currentPassword: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  newPassword: string;
}
