import { execSync } from 'child_process';

export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://ftn:ftn_dev@localhost:5432/ftn_test?schema=public';
  // Fresh schema from migrations — tests run against exactly what production would get.
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
