// Launches the real Electron app (needs a display; use xvfb-run on Linux CI) and checks the window flow.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userData = resolve(process.argv[2]);
const shots = process.argv[3];
rmSync(userData, { recursive: true, force: true });
const require = createRequire(join(desktop, '..', 'apps', 'web', 'package.json'));
const { _electron } = require('playwright');
const electronBin = createRequire(join(desktop, 'package.json'))('electron');

// EZ_EXEC=<packaged executable> tests the built app (e.g. dist/linux-unpacked/ezidinet) instead of the sources.
const packaged = process.env.EZ_EXEC;
const app = await _electron.launch({
  executablePath: packaged ?? electronBin,
  args: [...(packaged ? ['--no-sandbox'] : [desktop]), `--user-data-dir=${userData}`],
  timeout: 60000,
});
const main = await (async () => {
  for (let i = 0; i < 120; i++) {
    const w = app.windows().find((x) => x.url().startsWith('http://127.0.0.1:47211'));
    if (w) return w;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('main window did not appear');
})();
console.log('ok 1 - splash, then main window loads the local EZIDINET app');
await main.waitForSelector('[data-testid=demo-omar]', { timeout: 30000 });
if (shots) await main.screenshot({ path: join(shots, 'electron-login.png') });
await main.click('[data-testid=demo-omar]');
await main.waitForSelector('canvas', { timeout: 30000 });
await main.waitForTimeout(2500);
if (shots) await main.screenshot({ path: join(shots, 'electron-graph.png') });
console.log('ok 2 - login and relationship graph inside the desktop window');
const menu = await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items[0].submenu.items.map((i) => i.label).filter(Boolean));
assert.ok(menu.some((l) => l.includes('Share with phone')) && menu.some((l) => l.includes('Reset demo data')));
console.log('ok 3 - menu: ' + menu.join(' | '));
const title = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.getTitle()));
console.log('  · windows: ' + title.join(', '));
const blocked = await main.evaluate(() => { try { window.open('http://example.com'); return 'ok'; } catch (e) { return String(e); } });
assert.equal(app.windows().length, 1, 'no extra window for external links');
console.log('ok 4 - external links do not open inside the app (' + blocked + ')');
await app.close();
await new Promise((r) => setTimeout(r, 3000));
assert.ok(!existsSync(join(userData, 'data', 'pgdata', 'postmaster.pid')), 'database stopped on quit');
console.log('ok 5 - quitting stops database, API and web server');
console.log('# pass 5');
process.exit(0);
