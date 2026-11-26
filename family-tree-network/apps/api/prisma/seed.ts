import { PrismaClient } from '@prisma/client';
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD } from './demo-data';
import { seedDemo, seedRelationshipTypes, wipe } from './seed-lib';

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedRelationshipTypes(prisma);
    if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO === 'false') {
      console.log('Seeded relationship types only.');
      return;
    }
    await wipe(prisma);
    const { profileIds } = await seedDemo(prisma);
    console.log(`Seeded relationship types and ${profileIds.size} DEMO profiles (development only).`);
    console.log(`Demo login: omar@${DEMO_EMAIL_DOMAIN} / ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
