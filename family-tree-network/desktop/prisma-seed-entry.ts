// Seed entry used only by EZIDINET Desktop (bundled by desktop/scripts/build-bundle.mjs).
// Fictional demo network for local testing — the same data as `npm run db:seed` in development.
import { PrismaClient } from '@prisma/client';
import { seedDemo, seedRelationshipTypes, wipe } from '../apps/api/prisma/seed-lib';

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedRelationshipTypes(prisma);
    if (process.env.SEED_DEMO !== 'false') {
      await wipe(prisma);
      await seedDemo(prisma);
    }
    console.log('seed: done');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
