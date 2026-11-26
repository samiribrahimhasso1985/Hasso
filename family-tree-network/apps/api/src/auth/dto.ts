import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(200)
  password: string;
}
