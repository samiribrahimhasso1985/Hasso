import { HttpStatus, Injectable } from '@nestjs/common';
import { QrScanOutcome } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { GraphLoader } from '../graph/graph-loader.service';
import { personSummary } from '../graph/present';
import { PrismaService } from '../prisma/prisma.service';
import { assignEzidId } from './ezid';
import { decryptQrToken, encryptQrToken, hashQrToken, newQrToken } from './qr-crypto';

/** One uniform answer for every unusable code, so scanners cannot learn why (anti-enumeration). */
const invalid = () => new AppError(HttpStatus.NOT_FOUND, 'QR_INVALID', 'This code is not valid or has expired');
const TEMPORARY_MAX_MINUTES = 7 * 24 * 60;

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: GraphLoader,
    private readonly audit: AuditService,
  ) {}

  private async ownProfile(user: AuthUser) {
    const p = await this.prisma.profile.findUnique({ where: { id: user.profileId } });
    if (!p || p.userId !== user.userId) throw new AppError(HttpStatus.FORBIDDEN, 'NOT_ACCOUNT_HOLDER', 'Only account holders have a digital identity');
    return p;
  }

  /** My digital identity: EZID ID, current personal QR token, settings. */
  async me(user: AuthUser) {
    const p = await this.ownProfile(user);
    const ezidId = await assignEzidId(this.prisma, p.id);
    const qr = await this.prisma.qrToken.findFirst({
      where: { profileId: p.id, kind: 'PERSONAL', revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ezidId,
      displayName: p.displayName,
      qrEnabled: p.qrEnabled,
      discoverable: p.searchable && !p.isMinor,
      qr: qr ? { token: decryptQrToken(qr.tokenEncrypted), createdAt: qr.createdAt, expiresAt: qr.expiresAt } : null,
    };
  }

  /** Creates (or regenerates) a QR token. Regenerating a personal token revokes the previous one. */
  async createQr(user: AuthUser, kind: 'PERSONAL' | 'TEMPORARY', ttlMinutes?: number) {
    const p = await this.ownProfile(user);
    const token = newQrToken();
    const expiresAt = kind === 'TEMPORARY' ? new Date(Date.now() + Math.min(ttlMinutes ?? 60, TEMPORARY_MAX_MINUTES) * 60_000) : null;
    const created = await this.prisma.$transaction(async (tx) => {
      if (kind === 'PERSONAL') {
        await tx.qrToken.updateMany({ where: { profileId: p.id, kind: 'PERSONAL', revokedAt: null }, data: { revokedAt: new Date() } });
      }
      const row = await tx.qrToken.create({
        data: { profileId: p.id, kind, tokenHash: hashQrToken(token), tokenEncrypted: encryptQrToken(token), expiresAt },
      });
      await this.audit.log(user.userId, 'qr.create', 'qr_token', row.id, { kind }, tx);
      return row;
    });
    return { token, kind, createdAt: created.createdAt, expiresAt };
  }

  /** Revokes all active tokens of this person. */
  async revokeQr(user: AuthUser) {
    const p = await this.ownProfile(user);
    const r = await this.prisma.qrToken.updateMany({ where: { profileId: p.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log(user.userId, 'qr.revoke', 'profile', p.id, { count: r.count });
    return { revoked: r.count };
  }

  async updateSettings(user: AuthUser, dto: { qrEnabled?: boolean; discoverable?: boolean }) {
    const p = await this.ownProfile(user);
    await this.prisma.profile.update({
      where: { id: p.id },
      data: { qrEnabled: dto.qrEnabled, searchable: p.isMinor ? false : dto.discoverable },
    });
    await this.audit.log(user.userId, 'identity.settings', 'profile', p.id, dto);
    return this.me(user);
  }

  /**
   * Resolves a scanned code to the minimal public summary of its owner.
   * Never creates or changes a relationship; the scanner may then send a request.
   */
  async resolve(user: AuthUser, token: string) {
    const record = async (outcome: QrScanOutcome, tokenId: string | null) =>
      this.prisma.qrScanEvent.create({ data: { tokenId, scannerProfileId: user.profileId, outcome } });
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      await record('INVALID', null);
      throw invalid();
    }
    const row = await this.prisma.qrToken.findUnique({
      where: { tokenHash: hashQrToken(token) },
      include: { profile: { include: { identifier: true } } },
    });
    if (!row) {
      await record('INVALID', null);
      throw invalid();
    }
    const outcome: QrScanOutcome = row.revokedAt
      ? 'REVOKED'
      : row.expiresAt && row.expiresAt < new Date()
        ? 'EXPIRED'
        : !row.profile.qrEnabled || row.profile.isMinor || !row.profile.userId
          ? 'DISABLED'
          : (await this.loader.blockedFor(user)).includes(row.profileId)
            ? 'BLOCKED'
            : row.profileId === user.profileId
              ? 'SELF'
              : 'OK';
    await record(outcome, row.id);
    if (outcome !== 'OK' && outcome !== 'SELF') throw invalid();
    await this.prisma.qrToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
    return {
      person: personSummary(row.profile),
      ezidId: row.profile.identifier?.ezidId ?? null,
      isSelf: outcome === 'SELF',
    };
  }
}
