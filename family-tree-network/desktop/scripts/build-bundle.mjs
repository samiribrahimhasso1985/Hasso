// Builds desktop/bundle: a self-contained copy of the EZIDINET API, seed, migrations and web server that
// EZIDINET Desktop runs with Electron's built-in Node.js. Run from desktop/: `npm run bundle`.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(here, '..');
const root = resolve(desktop, '..');
const api = join(root, 'apps/api');
const web = join(root, 'apps/web');
const out = join(desktop, 'bundle');
export const PORTS = { api: 47210, web: 47211, db: 47212 };

const run = (cmd, cwd = root, env = {}) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'api'), { recursive: true });

// 1. Engine + API (tsc keeps Nest's decorator metadata; esbuild then bundles the compiled JS).
run('npm run build -w @ftn/relationship-engine');
run('npx tsc -p tsconfig.build.json', api);

// Optional Nest/transport packages that are required lazily and are not installed.
const external = [
  '@prisma/client', '.prisma/client',
  '@nestjs/microservices', '@nestjs/microservices/*', '@nestjs/websockets', '@nestjs/websockets/*',
  'class-transformer/storage', '@fastify/*', 'fastify', 'cache-manager', 'ioredis', 'kafkajs', 'mqtt', 'nats',
  'amqplib', 'amqp-connection-manager', '@grpc/*', 'redis',
];
await build({
  entryPoints: [join(api, 'dist/main.js')], bundle: true, platform: 'node', target: 'node20', format: 'cjs',
  outfile: join(out, 'api/server.cjs'), external, logLevel: 'warning', keepNames: true,
});
await build({
  entryPoints: [join(desktop, 'prisma-seed-entry.ts')], bundle: true, platform: 'node', target: 'node20', format: 'cjs',
  outfile: join(out, 'api/seed.cjs'), external, logLevel: 'warning',
  tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
});

// 2. Prisma client with engines for Windows and this build machine.
const schemaSrc = readFileSync(join(api, 'prisma/schema.prisma'), 'utf8');
const clientOut = join(out, 'api/node_modules/.prisma/client').replace(/\\/g, '/');
const schema = schemaSrc.replace(
  /generator client \{[^}]*\}/,
  `generator client {\n  provider      = "prisma-client-js"\n  output        = "${clientOut}"\n  binaryTargets = ["native", "windows", "debian-openssl-3.0.x"]\n}`,
);
const tmpSchema = join(out, 'schema.prisma');
writeFileSync(tmpSchema, schema);
run(`npx prisma generate --schema "${tmpSchema}"`, api);
rmSync(tmpSchema);
cpSync(join(root, 'node_modules/@prisma/client'), join(out, 'api/node_modules/@prisma/client'), { recursive: true });

// 3. Database migrations (plain SQL, applied in order by the desktop runtime).
const migSrc = join(api, 'prisma/migrations');
mkdirSync(join(out, 'migrations'));
for (const d of readdirSync(migSrc).filter((n) => existsSync(join(migSrc, n, 'migration.sql'))).sort()) {
  cpSync(join(migSrc, d, 'migration.sql'), join(out, 'migrations', `${d}.sql`));
}

// 4. Web app as a standalone Next.js server; /api is proxied to the local API (same origin, no CORS).
run('npx next build', web, {
  NEXT_OUTPUT: 'standalone',
  NEXT_PUBLIC_API_URL: '/api',
  NEXT_PUBLIC_SHOW_DEMO: 'true',
  API_PROXY_TARGET: `http://127.0.0.1:${PORTS.api}/api`,
  NEXT_TELEMETRY_DISABLED: '1',
});
cpSync(join(web, '.next/standalone'), join(out, 'web'), { recursive: true });
cpSync(join(web, '.next/static'), join(out, 'web/apps/web/.next/static'), { recursive: true });
if (existsSync(join(web, 'public'))) cpSync(join(web, 'public'), join(out, 'web/apps/web/public'), { recursive: true });
// Image optimisation is off (next/image unused); drop the platform-specific `sharp` binaries it traced.
rmSync(join(out, 'web/node_modules/@img'), { recursive: true, force: true });
rmSync(join(out, 'web/node_modules/sharp'), { recursive: true, force: true });
// Next.js reads .env files at runtime too — never ship local development env files.
for (const f of ['.env', '.env.local', '.env.production', '.env.development']) rmSync(join(out, 'web/apps/web', f), { force: true });

writeFileSync(join(out, 'manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), ports: PORTS }, null, 2));
console.log(`bundle ready: ${out}`);
