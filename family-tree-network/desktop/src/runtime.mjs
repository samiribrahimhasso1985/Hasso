// EZIDINET Desktop runtime: embedded PostgreSQL + API + web server, all on this computer.
// Used by the Electron main process (src/main.mjs) and by scripts/test-runtime.mjs (plain Node).
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const PORTS = { api: 47210, web: 47211, db: 47212 };
const DB_NAME = 'ezidinet';
const DB_USER = 'ezidinet';

/** Per-installation secrets, generated on first start and kept only in the user's data folder. */
function loadConfig(dataDir) {
  const file = join(dataDir, 'config.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const cfg = {
    dbPassword: randomBytes(24).toString('base64url'),
    jwtSecret: randomBytes(48).toString('base64url'),
    qrTokenKey: randomBytes(32).toString('base64url'),
    seeded: false,
    shareOnLan: false,
  };
  writeFileSync(file, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return cfg;
}

export function saveConfig(dataDir, cfg) {
  writeFileSync(join(dataDir, 'config.json'), JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

/** IPv4 addresses a phone on the same Wi-Fi can use. */
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

async function waitForHttp(url, timeoutMs, isAlive) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isAlive && !isAlive()) throw new Error(`process for ${url} exited`);
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timeout waiting for ${url}`);
}

/** True if something accepts TCP connections on 127.0.0.1:port. */
function portInUse(port) {
  return new Promise((resolve) => {
    const sock = createConnection({ host: '127.0.0.1', port });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
    sock.setTimeout(1500, () => { sock.destroy(); resolve(false); });
  });
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function waitPortFree(port, ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (!(await portInUse(port))) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export class Runtime {
  /**
   * @param {{ dataDir: string, bundleDir: string, nodeExec: string, log?: (m: string) => void,
   *           createPostgresUser?: boolean }} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.children = {};
    mkdirSync(opts.dataDir, { recursive: true });
    mkdirSync(join(opts.dataDir, 'logs'), { recursive: true });
    this.cfg = loadConfig(opts.dataDir);
    this.log = opts.log ?? ((m) => console.log(m));
  }

  get databaseUrl() {
    return `postgresql://${DB_USER}:${encodeURIComponent(this.cfg.dbPassword)}@127.0.0.1:${PORTS.db}/${DB_NAME}?schema=public`;
  }

  /**
   * After a crash or power loss, processes of the previous session may still hold the ports.
   * Stop only processes this app recorded itself (pids.json / postmaster.pid) and only if their port is in use.
   */
  async cleanupStale() {
    const stale = [];
    const pidsFile = join(this.opts.dataDir, 'pids.json');
    if (existsSync(pidsFile)) {
      const pids = JSON.parse(readFileSync(pidsFile, 'utf8'));
      if (pids.api) stale.push([pids.api, PORTS.api]);
      if (pids.web) stale.push([pids.web, PORTS.web]);
    }
    const pmFile = join(this.opts.dataDir, 'pgdata', 'postmaster.pid');
    if (existsSync(pmFile)) {
      const pid = Number(readFileSync(pmFile, 'utf8').split(/\r?\n/)[0]);
      if (pid) stale.push([pid, PORTS.db]);
    }
    for (const [pid, port] of stale) {
      if (alive(pid) && (await portInUse(port))) {
        this.log(`Stopping a process left over from the last session (pid ${pid})`);
        try { process.kill(pid); } catch { /* already gone */ }
        await waitPortFree(port, 10000);
      }
    }
    for (const [name, port] of Object.entries(PORTS)) {
      if (await portInUse(port)) {
        throw new Error(`Port ${port} (${name}) is used by another program. Close it or restart the computer, then open EZIDINET again.`);
      }
    }
    this.pids = {};
  }

  recordPid(name, pid) {
    this.pids = { ...(this.pids ?? {}), [name]: pid };
    writeFileSync(join(this.opts.dataDir, 'pids.json'), JSON.stringify(this.pids));
  }

  async start() {
    await this.cleanupStale();
    await this.startDatabase();
    await this.migrate();
    if (!this.cfg.seeded) {
      await this.seed();
      this.cfg.seeded = true;
      saveConfig(this.opts.dataDir, this.cfg);
    }
    await this.startApi();
    await this.startWeb(this.cfg.shareOnLan);
    return this.urls();
  }

  urls() {
    const local = `http://127.0.0.1:${PORTS.web}`;
    const lan = this.cfg.shareOnLan ? lanAddresses().map((a) => `http://${a}:${PORTS.web}`) : [];
    return { local, lan };
  }

  async startDatabase() {
    const databaseDir = join(this.opts.dataDir, 'pgdata');
    const fresh = !existsSync(join(databaseDir, 'PG_VERSION'));
    const pgLog = createWriteStream(join(this.opts.dataDir, 'logs', 'postgres.log'), { flags: 'a' });
    this.pg = new EmbeddedPostgres({
      databaseDir,
      port: PORTS.db,
      user: DB_USER,
      password: this.cfg.dbPassword,
      persistent: true,
      createPostgresUser: Boolean(this.opts.createPostgresUser),
      // Listen on this computer only — the database is never reachable from the network.
      postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
      onLog: (m) => pgLog.write(`${m}\n`),
      onError: (m) => pgLog.write(`ERROR ${m}\n`),
    });
    if (fresh) {
      this.log('Creating the local database (first start)…');
      await this.pg.initialise();
    }
    await this.pg.start();
    const client = this.pg.getPgClient('postgres', '127.0.0.1');
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    await client.end();
    if (exists.rowCount === 0) await this.pg.createDatabase(DB_NAME);
  }

  /** Applies the API's SQL migrations in order; each one once. */
  async migrate() {
    const client = this.pg.getPgClient(DB_NAME, '127.0.0.1');
    await client.connect();
    try {
      await client.query('CREATE TABLE IF NOT EXISTS _desktop_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
      const done = new Set((await client.query('SELECT name FROM _desktop_migrations')).rows.map((r) => r.name));
      const dir = join(this.opts.bundleDir, 'migrations');
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
        if (done.has(file)) continue;
        this.log(`Applying migration ${file}`);
        await client.query('BEGIN');
        try {
          await client.query(readFileSync(join(dir, file), 'utf8'));
          await client.query('INSERT INTO _desktop_migrations(name) VALUES ($1)', [file]);
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }
    } finally {
      await client.end();
    }
  }

  env(extra = {}) {
    return {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      DATABASE_URL: this.databaseUrl,
      JWT_SECRET: this.cfg.jwtSecret,
      QR_TOKEN_KEY: this.cfg.qrTokenKey,
      NEXT_TELEMETRY_DISABLED: '1',
      ...extra,
    };
  }

  spawnNode(name, script, cwd, env) {
    const out = createWriteStream(join(this.opts.dataDir, 'logs', `${name}.log`), { flags: 'a' });
    const child = spawn(this.opts.nodeExec, [script], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.pipe(out);
    child.stderr.pipe(out);
    child.exited = false;
    child.on('exit', (code) => {
      child.exited = true;
      out.write(`[exit ${code}]\n`);
    });
    return child;
  }

  /** Wipes the local database content and loads the fictional demo network again. */
  async seed() {
    this.log('Loading the demo network…');
    const dir = join(this.opts.bundleDir, 'api');
    const child = this.spawnNode('seed', join(dir, 'seed.cjs'), dir, this.env({ NODE_ENV: 'development' }));
    const code = await new Promise((r) => child.on('exit', r));
    if (code !== 0) throw new Error(`demo data could not be loaded (exit ${code}) — see logs/seed.log`);
  }

  async startApi() {
    const dir = join(this.opts.bundleDir, 'api');
    const child = this.spawnNode('api', join(dir, 'server.cjs'), dir, this.env({
      PORT: String(PORTS.api),
      HOST: '127.0.0.1', // the API is never reachable from the network; phones use the web server's /api proxy
      CORS_ORIGIN: `http://127.0.0.1:${PORTS.web}`,
      AUTH_RATE_LIMIT_PER_MINUTE: '30',
      // No e-mail provider on a local computer: account e-mails appear in the developer mailbox (/dev/mailbox).
      MAIL_TRANSPORT: 'outbox',
      APP_URL: `http://127.0.0.1:${PORTS.web}`,
    }));
    this.children.api = child;
    this.recordPid('api', child.pid);
    await waitForHttp(`http://127.0.0.1:${PORTS.api}/api/health`, 60000, () => !child.exited);
  }

  /** The web server listens on this computer only, unless the user turns on phone sharing. */
  async startWeb(shareOnLan) {
    const dir = join(this.opts.bundleDir, 'web', 'apps', 'web');
    const child = this.spawnNode('web', join(dir, 'server.js'), dir, this.env({
      PORT: String(PORTS.web),
      HOSTNAME: shareOnLan ? '0.0.0.0' : '127.0.0.1',
    }));
    this.children.web = child;
    this.recordPid('web', child.pid);
    await waitForHttp(`http://127.0.0.1:${PORTS.web}/`, 60000, () => !child.exited);
  }

  async setShareOnLan(on) {
    this.cfg.shareOnLan = on;
    saveConfig(this.opts.dataDir, this.cfg);
    await this.stopChild('web');
    await this.startWeb(on);
    return this.urls();
  }

  async resetDemo() {
    await this.stopChild('api');
    await this.seed();
    await this.startApi();
  }

  async stopChild(name) {
    const child = this.children[name];
    if (!child || child.exited) return;
    await new Promise((resolve) => {
      child.once('exit', resolve);
      child.kill();
      setTimeout(resolve, 5000);
    });
  }

  async stop() {
    await this.stopChild('web');
    await this.stopChild('api');
    if (this.pg) await this.pg.stop().catch(() => {});
  }
}
