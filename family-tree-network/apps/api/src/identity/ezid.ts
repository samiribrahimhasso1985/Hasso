import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import type { Db } from '../prisma/prisma.service';

/** "EZ-" + 8 random digits: non-sequential, no personal data (EZIDNET decision EZ-4). */
export function generateEzidId(): string {
  return `EZ-${randomInt(0, 100_000_000).toString().padStart(8, '0')}`;
}

/** Assigns an EZID ID to an account holder's profile, retrying on the (rare) collision. Idempotent. */
export async function assignEzidId(db: Db, profileId: string): Promise<string> {
  const existing = await db.userIdentifier.findUnique({ where: { profileId } });
  if (existing) return existing.ezidId;
  for (let attempt = 0; attempt < 8; attempt++) {
    const ezidId = generateEzidId();
    try {
      await db.userIdentifier.create({ data: { profileId, ezidId } });
      return ezidId;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new Error('Could not allocate a unique EZID ID');
}
