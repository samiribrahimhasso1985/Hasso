import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPurpose, ConsentKind } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors.filter';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { assignEzidId } from '../identity/ezid';
import { passwordProblem } from './password-policy';
import { newSecretToken, sha256 } from './tokens';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
// Constant-time-ish failure path: compare against a real hash even when the user does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);
/** Version of the consent texts the person agreed to (drafts until legal review — EZ-10). */
export const CONSENT_VERSION = '2026-11-draft-1';
const SESSION_HOURS = 12;
const VERIFY_HOURS = 24;
const RESET_MINUTES = 60;
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const tokenInvalid = () => new AppError(HttpStatus.BAD_REQUEST, 'TOKEN_INVALID', 'This link is invalid or has expired');
const hours = (h: number) => new Date(Date.now() + h * 3_600_000);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  private assertPassword(password: string, email?: string) {
    const problem = passwordProblem(password, email);
    if (problem) throw new AppError(HttpStatus.BAD_REQUEST, problem, 'The password does not meet the requirements');
  }

  async register(dto: RegisterDto, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    this.assertPassword(dto.password, email);
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const locale = dto.locale ?? 'en';
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email, passwordHash, locale } });
      const profile = await tx.profile.create({
        data: {
          userId: u.id,
          displayName: dto.displayName.trim(),
          gender: dto.gender ?? 'UNSPECIFIED',
          country: dto.country ?? null,
          languages: [locale],
          createdById: u.id,
        },
      });
      await assignEzidId(tx, profile.id);
      await tx.consent.createMany({
        data: [ConsentKind.TERMS_PRIVACY, ConsentKind.SENSITIVE_DATA, ConsentKind.AGE_MINIMUM].map((kind) => ({
          userId: u.id, kind, version: CONSENT_VERSION,
        })),
      });
      await this.audit.log(u.id, 'user.register', 'user', u.id, { consentVersion: CONSENT_VERSION }, tx);
      return u;
    });
    await this.sendToken(user.id, email, AuthTokenPurpose.VERIFY_EMAIL, locale);
    return this.issue(user.id, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const key = sha256(`login:${email}`);
    const throttle = await this.prisma.loginThrottle.findUnique({ where: { emailHash: key } });
    if (throttle?.lockedUntil && throttle.lockedUntil > new Date()) {
      // Same answer whether or not the address is registered.
      throw new AppError(HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.', {
        retryAfterSeconds: Math.ceil((throttle.lockedUntil.getTime() - Date.now()) / 1000),
      });
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || user.deletedAt) {
      const failures = (throttle?.lockedUntil && throttle.lockedUntil <= new Date() ? 0 : throttle?.failures ?? 0) + 1;
      const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
      await this.prisma.loginThrottle.upsert({
        where: { emailHash: key },
        create: { emailHash: key, failures, lockedUntil },
        update: { failures: lockedUntil ? 0 : failures, lockedUntil },
      });
      if (user) await this.audit.log(user.id, 'user.login_failed', 'user', user.id);
      throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    if (throttle) await this.prisma.loginThrottle.delete({ where: { emailHash: key } }).catch(() => undefined);
    await this.audit.log(user.id, 'user.login', 'user', user.id);
    return this.issue(user.id, userAgent);
  }

  async logout(sessionId: string, userId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log(userId, 'user.logout', 'session', sessionId);
  }

  /** Ends every session of this account (all devices). */
  async logoutAll(userId: string) {
    const { count } = await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log(userId, 'user.logout_all', 'user', userId, { sessions: count });
    return { endedSessions: count };
  }

  async sessions(userId: string, currentSessionId: string) {
    const rows = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return rows.map((s) => ({ id: s.id, userAgent: s.userAgent, createdAt: s.createdAt, lastUsedAt: s.lastUsedAt, current: s.id === currentSessionId }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const res = await this.prisma.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (res.count === 0) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found');
  }

  async verifyEmail(token: string) {
    const row = await this.useToken(token, AuthTokenPurpose.VERIFY_EMAIL);
    await this.prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
    await this.audit.log(row.userId, 'user.email_verified', 'user', row.userId);
    return { verified: true };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return { alreadyVerified: true };
    await this.sendToken(user.id, user.email, AuthTokenPurpose.VERIFY_EMAIL, user.locale);
    return { sent: true };
  }

  /** Always answers the same way, so it cannot be used to find out which addresses are registered. */
  async forgotPassword(emailRaw: string, locale?: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.deletedAt) {
      await this.sendToken(user.id, email, AuthTokenPurpose.RESET_PASSWORD, locale ?? user.locale);
      await this.audit.log(user.id, 'user.password_reset_requested', 'user', user.id);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Check the link and the new password first, so a rejected password does not use up the link.
    const pending = await this.findToken(dto.token, AuthTokenPurpose.RESET_PASSWORD);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: pending.userId } });
    this.assertPassword(dto.password, user.email);
    await this.useToken(dto.token, AuthTokenPurpose.RESET_PASSWORD);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      // Opening the link proves access to the mailbox, so the address counts as verified too.
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() } }),
      this.prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.loginThrottle.deleteMany({ where: { emailHash: sha256(`login:${user.email}`) } }),
    ]);
    await this.audit.log(user.id, 'user.password_reset', 'user', user.id);
    return { ok: true };
  }

  async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'The current password is incorrect');
    }
    this.assertPassword(dto.newPassword, user.email);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Other devices are signed out; this one stays signed in.
      this.prisma.session.updateMany({ where: { userId, revokedAt: null, id: { not: sessionId } }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log(userId, 'user.password_changed', 'user', userId);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    return {
      userId: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      locale: user.locale,
      profileId: user.profile!.id,
      displayName: user.profile!.displayName,
      // The mailbox link is only offered where the mailbox is open (local testing), never where it needs a key.
      mailbox: this.mail.outboxEnabled && !process.env.OUTBOX_KEY ? 'developer' : null,
    };
  }

  private async sendToken(userId: string, email: string, purpose: AuthTokenPurpose, locale: string) {
    const token = newSecretToken();
    const expiresAt = purpose === AuthTokenPurpose.VERIFY_EMAIL ? hours(VERIFY_HOURS) : new Date(Date.now() + RESET_MINUTES * 60_000);
    await this.prisma.$transaction([
      // Only the newest link of each kind works.
      this.prisma.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.authToken.create({ data: { userId, purpose, tokenHash: sha256(token), expiresAt } }),
    ]);
    await this.mail.send(purpose === AuthTokenPurpose.VERIFY_EMAIL ? 'verify' : 'reset', email, token, locale);
  }

  private async findToken(token: string, purpose: AuthTokenPurpose) {
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= new Date()) throw tokenInvalid();
    return row;
  }

  /** Marks a token as used exactly once (atomic), or fails with one uniform error. */
  private async useToken(token: string, purpose: AuthTokenPurpose) {
    const row = await this.findToken(token, purpose);
    const res = await this.prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (res.count !== 1) throw tokenInvalid();
    return row;
  }

  private async issue(userId: string, userAgent?: string) {
    const profile = await this.prisma.profile.findUniqueOrThrow({ where: { userId } });
    const session = await this.prisma.session.create({
      data: { userId, userAgent: userAgent?.slice(0, 200) ?? null, expiresAt: hours(SESSION_HOURS) },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, pid: profile.id, sid: session.id });
    return { accessToken, ...(await this.me(userId)) };
  }
}

