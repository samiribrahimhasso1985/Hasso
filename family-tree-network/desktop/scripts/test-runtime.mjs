// End-to-end test of the EZIDINET Desktop runtime with plain Node.js (no window):
// first start (database created, migrations, demo data) → login in a real browser → phone sharing on/off →
// restart (data kept, no second seed). Usage: node scripts/test-runtime.mjs <empty data dir>
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTS, Runtime, lanAddresses } from '../src/runtime.mjs';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(process.argv[2] ?? join(desktop, '.test-data'));
const shots = process.argv[3];
rmSync(dataDir, { recursive: true, force: true });
const require = createRequire(join(desktop, '..', 'apps', 'web', 'package.json'));
const { chromium } = require('playwright');

const mk = () => new Runtime({ dataDir, bundleDir: join(desktop, 'bundle'), nodeExec: process.execPath, log: (m) => console.log(`  · ${m}`) });
let ok = 0;
const step = async (name, fn) => { await fn(); ok++; console.log(`ok ${ok} - ${name}`); };

let rt = mk();
await step('first start: database, migrations, demo data, API and web server', async () => {
  const t = Date.now();
  const urls = await rt.start();
  assert.equal(urls.local, `http://127.0.0.1:${PORTS.web}`);
  assert.deepEqual(urls.lan, []);
  console.log(`  · started in ${((Date.now() - t) / 1000).toFixed(1)} s`);
});

await step('config holds per-install secrets; database is local only', async () => {
  const cfg = JSON.parse(readFileSync(join(dataDir, 'config.json'), 'utf8'));
  assert.ok(cfg.jwtSecret.length >= 40 && cfg.qrTokenKey.length >= 40 && cfg.dbPassword.length >= 20);
  assert.equal(cfg.seeded, true);
  const conf = readFileSync(join(dataDir, 'pgdata', 'postmaster.opts'), 'utf8');
  assert.match(conf, /listen_addresses=127\.0\.0\.1/);
});

const browser = await chromium.launch();
await step('login with the demo account and see the relationship graph (via /api proxy)', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORTS.web}/`);
  await page.click('[data-testid=demo-omar]');
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(2500);
  assert.match(await page.locator('body').innerText(), /EZIDINET/);
  if (shots) await page.screenshot({ path: join(shots, 'desktop-graph.png') });
  // Digital identity tab shows the EZID ID.
  await page.locator('[role=tab]').last().click();
  await page.waitForTimeout(1500);
  assert.match(await page.locator('body').innerText(), /EZ-\d{8}/);
  if (shots) await page.screenshot({ path: join(shots, 'desktop-identity.png') });
  assert.deepEqual(errors, []);
  await page.close();
});

await step('API is not reachable from the network (bound to 127.0.0.1)', async () => {
  const ip = lanAddresses()[0];
  if (!ip) return console.log('  · no LAN interface, skipped');
  await assert.rejects(fetch(`http://${ip}:${PORTS.api}/api/health`));
  await assert.rejects(fetch(`http://${ip}:${PORTS.web}/`)); // sharing is off by default
});

await step('phone sharing on → web reachable on the LAN address; off again → not reachable', async () => {
  const ip = lanAddresses()[0];
  if (!ip) return console.log('  · no LAN interface, skipped');
  const urls = await rt.setShareOnLan(true);
  assert.ok(urls.lan.includes(`http://${ip}:${PORTS.web}`));
  assert.equal((await fetch(`http://${ip}:${PORTS.web}/`)).status, 200);
  assert.equal((await fetch(`http://${ip}:${PORTS.web}/api/health`)).status, 200); // API only via the web proxy
  await assert.rejects(fetch(`http://${ip}:${PORTS.api}/api/health`));
  await rt.setShareOnLan(false);
  await assert.rejects(fetch(`http://${ip}:${PORTS.web}/`));
});

await step('reset demo data works', async () => {
  await rt.resetDemo();
  const res = await fetch(`http://127.0.0.1:${PORTS.web}/api/auth/login?locale=en`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'omar@demo.ftn.local', password: 'demo-password-2026' }),
  });
  assert.equal(res.status, 200);
});

await step('stop and restart: data kept, no second seed, migrations not re-applied', async () => {
  await rt.stop();
  rt = mk();
  const logs = [];
  rt.log = (m) => logs.push(m);
  await rt.start();
  assert.ok(!logs.some((m) => /demo network|migration|first start/i.test(m)), logs.join('\n'));
  const res = await fetch(`http://127.0.0.1:${PORTS.web}/api/auth/login?locale=en`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'anna@demo.ftn.local', password: 'demo-password-2026' }),
  });
  assert.equal(res.status, 200);
});

await browser.close();
await rt.stop();

await step('after a crash (process killed, children orphaned) the next start cleans up and works', async () => {
  const { spawn } = await import('node:child_process');
  const code = `import { Runtime } from ${JSON.stringify(new URL('../src/runtime.mjs', import.meta.url).href)};
    const rt = new Runtime({ dataDir: ${JSON.stringify(dataDir)}, bundleDir: ${JSON.stringify(join(desktop, 'bundle'))}, nodeExec: process.execPath, log: () => {} });
    await rt.start(); console.log('READY');`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => {
    child.stdout.on('data', (d) => String(d).includes('READY') && res());
    child.on('exit', (c) => rej(new Error(`crash helper exited ${c}`)));
  });
  child.kill('SIGKILL'); // simulated crash: database, API and web server stay running as orphans
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal((await fetch(`http://127.0.0.1:${PORTS.web}/`)).status, 200, 'orphans still running');
  rt = mk();
  const logs = [];
  rt.log = (m) => logs.push(m);
  await rt.start();
  assert.ok(logs.some((m) => /left over/.test(m)), logs.join('\n'));
  const res = await fetch(`http://127.0.0.1:${PORTS.web}/api/auth/login?locale=en`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'sara@demo.ftn.local', password: 'demo-password-2026' }),
  });
  assert.equal(res.status, 200);
  await rt.stop();
});
assert.ok(!existsSync(join(dataDir, 'pgdata', 'postmaster.pid')), 'database stopped cleanly');
console.log(`# pass ${ok}`);
process.exit(0);
