import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Db, PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records a security-relevant action. Never store secrets or full private payloads here. */
  log(actorId: string | null, action: string, entityType: string, entityId: string, data?: Record<string, unknown>, db: Db = this.prisma) {
    return db.auditLog.create({
      data: { actorId, action, entityType, entityId, data: (data ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }
}
