import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { PrismaService } from '../prisma/prisma.service';

const TOUCH_MS = 5 * 60_000; // update "last used" at most every 5 minutes

/**
 * Global guard: every route requires a valid bearer token unless marked @Public().
 * The token must belong to a live server-side session, so logout really ends access.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const denied = (m: string) => new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', m);
    if (!token) throw denied('Authentication required');
    let payload: { sub: string; pid: string; sid?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw denied('Invalid or expired token');
    }
    if (!payload.sid) throw denied('Invalid or expired token');
    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    const now = new Date();
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= now) {
      throw denied('Your session has ended. Please sign in again.');
    }
    if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: now } }).catch(() => undefined);
    }
    req.user = { userId: payload.sub, profileId: payload.pid, sessionId: session.id };
    return true;
  }
}
