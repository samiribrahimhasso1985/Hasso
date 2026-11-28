import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Staff (calendar editors and event reviewers) — kept minimal and owner-controlled until the administrator model
 * (decision D-C6) exists: the e-mail addresses in STAFF_EMAILS (comma separated) on the server. Every staff action
 * is written to the audit log.
 */
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private list() {
    return (process.env.STAFF_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  async isStaff(user: AuthUser | null | undefined) {
    if (!user) return false;
    const emails = this.list();
    if (!emails.length) return false;
    const u = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { email: true } });
    return Boolean(u && emails.includes(u.email.toLowerCase()));
  }

  async assertStaff(user: AuthUser) {
    if (!(await this.isStaff(user))) throw new AppError(HttpStatus.FORBIDDEN, 'STAFF_ONLY', 'Only calendar editors and reviewers can do this');
  }
}
