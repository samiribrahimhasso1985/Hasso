import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { IdentityService } from './identity.service';

class CreateQrDto {
  @IsOptional() @IsIn(['PERSONAL', 'TEMPORARY']) kind?: 'PERSONAL' | 'TEMPORARY';
  @IsOptional() @IsInt() @Min(5) @Max(7 * 24 * 60) ttlMinutes?: number;
}

class IdentitySettingsDto {
  @IsOptional() @IsBoolean() qrEnabled?: boolean;
  @IsOptional() @IsBoolean() discoverable?: boolean;
}

const QR_RESOLVE_LIMIT = Number(process.env.QR_RESOLVE_PER_MINUTE ?? 30);

@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get('identity/me')
  me(@AuthUserParam() user: AuthUser) {
    return this.identity.me(user);
  }

  @Post('identity/qr')
  createQr(@AuthUserParam() user: AuthUser, @Body() dto: CreateQrDto) {
    return this.identity.createQr(user, dto.kind ?? 'PERSONAL', dto.ttlMinutes);
  }

  @Delete('identity/qr')
  revokeQr(@AuthUserParam() user: AuthUser) {
    return this.identity.revokeQr(user);
  }

  @Patch('identity/settings')
  settings(@AuthUserParam() user: AuthUser, @Body() dto: IdentitySettingsDto) {
    return this.identity.updateSettings(user, dto);
  }

  /** Resolve a scanned code (rate-limited, uniform errors). */
  @Throttle({ default: { limit: QR_RESOLVE_LIMIT, ttl: 60_000 } })
  @Get('qr/:token')
  resolve(@AuthUserParam() user: AuthUser, @Param('token') token: string) {
    return this.identity.resolve(user, token);
  }
}
