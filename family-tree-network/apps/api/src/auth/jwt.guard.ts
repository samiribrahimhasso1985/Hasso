import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from '../common/auth-user';
import { AppError } from '../common/errors.filter';

/** Global guard: every route requires a valid bearer token unless marked @Public(). */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Authentication required');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; pid: string }>(token);
      req.user = { userId: payload.sub, profileId: payload.pid };
      return true;
    } catch {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Invalid or expired token');
    }
  }
}
