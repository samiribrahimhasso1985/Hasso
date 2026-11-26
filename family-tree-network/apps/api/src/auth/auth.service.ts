import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors.filter';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';

const BCRYPT_ROUNDS = 12;
// Constant-time-ish failure path: compare against a real hash even when the user does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email, passwordHash, locale: dto.locale ?? 'en' } });
      await tx.profile.create({
        data: { userId: u.id, displayName: dto.displayName.trim(), gender: dto.gender ?? 'UNSPECIFIED', createdById: u.id },
      });
      await this.audit.log(u.id, 'user.register', 'user', u.id, undefined, tx);
      return u;
    });
    return this.issue(user.id);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || user.deletedAt) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    await this.audit.log(user.id, 'user.login', 'user', user.id);
    return this.issue(user.id);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    return {
      userId: user.id,
      email: user.email,
      locale: user.locale,
      profileId: user.profile!.id,
      displayName: user.profile!.displayName,
    };
  }

  private async issue(userId: string) {
    const profile = await this.prisma.profile.findUniqueOrThrow({ where: { userId } });
    const accessToken = await this.jwt.signAsync({ sub: userId, pid: profile.id });
    return { accessToken, ...(await this.me(userId)) };
  }
}
