import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, AuthUserParam, Public } from '../common/auth-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './dto';

const AUTH_LIMIT = Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? 10);
const limit = Throttle({ default: { limit: AUTH_LIMIT, ttl: 60_000 } });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @limit
  @Post('register')
  register(@Body() dto: RegisterDto, @Headers('user-agent') ua?: string) {
    return this.auth.register(dto, ua);
  }

  @Public() @limit
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Headers('user-agent') ua?: string) {
    return this.auth.login(dto, ua);
  }

  @HttpCode(204)
  @Post('logout')
  async logout(@AuthUserParam() user: AuthUser) {
    await this.auth.logout(user.sessionId, user.userId);
  }

  @HttpCode(200)
  @Post('logout-all')
  logoutAll(@AuthUserParam() user: AuthUser) {
    return this.auth.logoutAll(user.userId);
  }

  @Get('sessions')
  sessions(@AuthUserParam() user: AuthUser) {
    return this.auth.sessions(user.userId, user.sessionId);
  }

  @HttpCode(204)
  @Delete('sessions/:id')
  async revokeSession(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.auth.revokeSession(user.userId, id);
  }

  @Public() @limit
  @HttpCode(200)
  @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @limit
  @HttpCode(200)
  @Post('resend-verification')
  resend(@AuthUserParam() user: AuthUser) {
    return this.auth.resendVerification(user.userId);
  }

  @Public() @limit
  @HttpCode(200)
  @Post('forgot-password')
  forgot(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email, dto.locale);
  }

  @Public() @limit
  @HttpCode(200)
  @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @limit
  @HttpCode(200)
  @Post('change-password')
  change(@AuthUserParam() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.userId, user.sessionId, dto);
  }

  @Get('me')
  me(@AuthUserParam() user: AuthUser) {
    return this.auth.me(user.userId);
  }
}
