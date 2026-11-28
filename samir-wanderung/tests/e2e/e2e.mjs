// End-to-end tests in real Chromium against the production build served by the SAMIR WANDERUNG
// server, using live providers (OpenFreeMap, AWS terrain, Valhalla, Nominatim, Wikidata).
// Usage: node tests/e2e/e2e.mjs [stage...]   (stages: core planner cinematic world atlas live community studio offline mobile)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed browser
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://localhost:8787';
const OUT = process.env.OUT_DIR || 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const stages = process.argv.slice(2);
const want = (s) => !stages.length || stages.includes(s);
const results = [];
const record = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
async function check(name, fn) { try { const d = await fn(); record(name, true, d ?? ''); } catch (e) { record(name, false, String(e.message || e).split('\n')[0].slice(0, 300)); } }
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: want('cinematic') ? { dir: 'test-results/video', size: { width: 1440, height: 900 } } : undefined });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const setRange = (sel, v) => page.$eval(sel, (el, val) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|403|429|Could not load image|AJAXError/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });

const go = async (hash) => { await page.goto(`${BASE}/#/${hash}`); await page.waitForLoadState('domcontentloaded'); };
const mapIdle = async (timeout = 30000) => {
  await page.waitForSelector('.maplibregl-canvas', { timeout });
  await page.waitForFunction(() => document.querySelectorAll('.maplibregl-canvas').length > 0, null, { timeout });
  await page.waitForTimeout(12000); // let DEM + vector tiles stream in (software WebGL in CI is slow)
};
async function pickPlace(id, query, matcher) {
  await page.fill(`#${id}`, query);
  const opt = page.locator(`#${id}-list [role=option] button`).filter({ hasText: matcher ?? query }).first();
  await opt.waitFor({ timeout: 20000 });
  await opt.click();
}

if (want('core')) {
  await check('Home renders with brand and tagline', async () => {
    await go('home');
    await page.getByRole('heading', { name: /SAMIR/ }).first().waitFor();
    assert(await page.getByText('EXPLORE THE WORLD. EXPERIENCE THE JOURNEY.').first().isVisible(), 'tagline');
  });
  await check('Map initialises with real tiles (canvas + terrain source)', async () => {
    await mapIdle();
    const n = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /openfreemap|elevation-tiles-prod/.test(r.name)).length);
    assert(n > 5, `tile requests: ${n}`);
    await page.screenshot({ path: `${OUT}/01-home.png` });
    return `${n} tile/style requests`;
  });
  for (const [id, label] of [['world', 'World Explorer'], ['planner', 'Journey Planner'], ['cinematic', 'Cinematic Journey'], ['live', 'Live Navigation'], ['mountain', 'Mountain Explorer'], ['journeys', 'My Journeys'], ['atlas', 'Nature Atlas'], ['assistant', 'AI Assistant'], ['community', 'Community'], ['studio', 'Video Studio'], ['safety', 'Safety Center'], ['offline', 'Offline Maps'], ['settings', 'Settings']]) {
    await check(`Navigation → ${label}`, async () => {
      await page.goto(`${BASE}/#/home`);
      await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: label }).click();
      await page.waitForFunction((h) => location.hash === `#/${h}`, id);
      await page.waitForTimeout(600);
      assert(await page.locator('main').isVisible(), 'main');
    });
  }
  await check('Language switching EN → AR (RTL) → DE → KU → EN', async () => {
    await go('home');
    await page.selectOption('[data-testid=lang-select]', 'ar');
    assert(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'dir rtl');
    assert(await page.getByRole('button', { name: 'مخطط الرحلات' }).first().isVisible(), 'arabic nav');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/02-home-arabic-rtl.png` });
    await page.selectOption('[data-testid=lang-select]', 'de');
    assert(await page.evaluate(() => document.documentElement.dir) === 'ltr', 'dir ltr');
    assert(await page.getByRole('button', { name: 'Routenplaner' }).first().isVisible(), 'german nav');
    await page.selectOption('[data-testid=lang-select]', 'ku');
    assert(await page.getByRole('button', { name: 'Plansazkerê Rêwîtiyê' }).first().isVisible(), 'kurdish nav');
    await page.selectOption('[data-testid=lang-select]', 'en');
  });
}

if (want('planner') || want('cinematic') || want('studio') || want('live')) {
  await check('Planner: real route Eibsee → Zugspitze via geocoder + Valhalla', async () => {
    await go('planner');
    await mapIdle();
    await pickPlace('pt-0', 'Eibsee', /Eibsee/);
    await pickPlace('pt-1', 'Zugspitze', /Zugspitze/);
    await page.selectOption('#rtype', 'mountain');
    await page.click('[data-testid=calculate]');
    await page.waitForSelector('[data-testid=route-details]', { timeout: 90000 });
    const text = await page.locator('[data-testid=route-details]').innerText();
    const km = parseFloat(text.match(/([\d.,]+)\s*km/)[1].replace(',', '.'));
    assert(km > 5 && km < 30, `distance ${km}`);
    const asc = parseInt(text.match(/Ascent\s*\n?\s*(\d+)/i)[1]);
    assert(asc > 1500, `ascent ${asc}`);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/03-planner-route-3d.png` });
    return `${km} km, ascent ${asc} m`;
  });
  await check('Planner: alternatives listed / intermediate stop recalculates', async () => {
    const alts = await page.locator('section[aria-label="Route comparison"] button').count();
    await page.getByRole('button', { name: /Add stop/ }).click();
    await pickPlace('pt-1', 'Knorrhütte', /Knorr/);
    await page.click('[data-testid=calculate]');
    await page.waitForFunction(() => document.querySelectorAll('.sw-marker-stop').length === 1, null, { timeout: 90000 });
    await page.waitForSelector('[data-testid=route-details]', { timeout: 90000 });
    await page.waitForTimeout(2000);
    const text = await page.locator('[data-testid=route-details]').innerText();
    return `alternatives first calc: ${alts}; with stop: ${text.match(/([\d.,]+)\s*km/)[1]} km`;
  });
  await check('Planner: elevation profile rendered & save journey', async () => {
    assert(await page.locator('svg[aria-label="Elevation profile"]').count() > 0, 'profile');
    await page.getByRole('button', { name: 'Save journey' }).click();
    await page.getByText('Journey saved').waitFor();
  });
  await check('Planner: unroutable points show an error, not a fake route', async () => {
    await go('planner'); await page.reload(); // fresh plan state (two points)
    await page.waitForSelector('#pt-1');
    await page.fill('#pt-0', '30.0, -30.0'); await page.press('#pt-0', 'Enter');
    await page.fill('#pt-1', '31.0, -31.0'); await page.press('#pt-1', 'Enter');
    await page.click('[data-testid=calculate]');
    const msg = page.getByText(/No hiking route found|Something went wrong/).first();
    await msg.waitFor({ timeout: 90000 });
    await page.waitForTimeout(500);
    assert(!(await page.locator('[data-testid=route-details]').count()), 'no route details shown');
    return (await msg.innerText()).slice(0, 80);
  });
}

if (want('cinematic')) {
  await check('Cinematic: simulation label, play moves hiker along real route', async () => {
    await go('journeys');
    await page.getByRole('button', { name: /Animate/ }).first().click();
    await page.waitForSelector('[data-testid=sim-label]');
    assert((await page.locator('[data-testid=sim-label]').innerText()).includes('CINEMATIC SIMULATION'), 'label');
    await mapIdle();
    const pos0 = await page.locator('[data-testid=position]').innerText();
    await page.waitForSelector('[data-testid=play]:not([disabled])', { timeout: 120000 });
    await page.$eval('[data-testid=play]', (el) => el.click());
    const t0 = Date.now();
    await page.waitForFunction(() => parseInt(document.querySelector('[data-testid=progress]').textContent) >= 3, null, { timeout: 120000 });
    const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
    const pos1 = await page.locator('[data-testid=position]').innerText();
    const prog = parseInt(await page.locator('[data-testid=progress]').innerText());
    assert(pos0 !== pos1 && prog > 0, `pos ${pos0} → ${pos1}, ${prog}%`);
    await page.screenshot({ path: `${OUT}/04-cinematic-follow.png` });
    return `progress ${prog}% after ${((Date.now() - t0) / 1000).toFixed(0)} s wall time; ~${fps.toFixed(1)} fps in software WebGL`;
  });
  await check('Cinematic: hiker position lies on the route geometry', async () => {
    // Compare displayed position with the stored route geometry via IndexedDB.
    const pos = (await page.locator('[data-testid=position]').innerText()).split(',').map(Number);
    const dist = await page.evaluate(([lat, lon]) => new Promise((res) => {
      const r = indexedDB.open('samir-wanderung');
      r.onsuccess = () => { const tx = r.result.transaction('journeys'); const q = tx.objectStore('journeys').getAll(); q.onsuccess = () => {
        const j = q.result.find((x) => x.route); const c = j.route.coords; let best = Infinity;
        for (let i = 0; i < c.length - 1; i++) { const [ax, ay] = c[i], [bx, by] = c[i + 1]; const kx = Math.cos(lat * Math.PI / 180) * 111320, ky = 110540;
          const px = (lon - ax) * kx, py = (lat - ay) * ky, dx = (bx - ax) * kx, dy = (by - ay) * ky; const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
          best = Math.min(best, Math.hypot(px - t * dx, py - t * dy)); }
        res(best); }; };
    }), pos);
    assert(dist < 2, `distance to route ${dist} m`);
    return `${dist.toFixed(2)} m from route polyline`;
  });
  await check('Cinematic: pause holds position; speeds; camera modes; scrub; arrival', async () => {
    await page.click('[data-testid=play]'); // pause
    const a = await page.locator('[data-testid=position]').innerText(); await page.waitForTimeout(1500);
    assert(a === await page.locator('[data-testid=position]').innerText(), 'paused position stable');
    for (const s of ['0.5x', '2x', '4x', '1x']) await page.getByRole('button', { name: s, exact: true }).click();
    await page.click('[data-testid=cam-aerial]'); await page.click('[data-testid=play]'); await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/05-cinematic-aerial.png` });
    await page.click('[data-testid=cam-free]'); await page.waitForTimeout(800); await page.click('[data-testid=cam-follow]');
    const max = await page.locator('[data-testid=timeline]').getAttribute('max');
    await setRange('[data-testid=timeline]', +max * 0.5); await page.waitForTimeout(500);
    const mid = parseInt(await page.locator('[data-testid=progress]').innerText());
    await setRange('[data-testid=timeline]', +max - 3);
    await page.waitForSelector('[data-testid=arrival]', { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/06-cinematic-arrival.png` });
    await page.click('[data-testid=restart]'); await page.waitForTimeout(800);
    const r = parseInt(await page.locator('[data-testid=progress]').innerText());
    assert(r < 5, `restart progress ${r}`);
    return `scrub 50% time → ${mid}% distance`;
  });
  await check('Cinematic: cleanup — leaving the page removes hiker marker & loops', async () => {
    await go('home'); await page.waitForTimeout(1000);
    assert(await page.locator('.sw-hiker').count() === 0, 'hiker removed');
    const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
    return heap ? `JS heap after leaving ${(heap / 1e6).toFixed(0)} MB` : '';
  });
}

if (want('world')) {
  await check('World Explorer: Cesium globe initialises, search flies to terrain', async () => {
    await go('world');
    await page.waitForSelector('[data-testid=globe] canvas', { timeout: 60000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${OUT}/07-world-globe.png` });
    await pickPlace('world-search', 'Matterhorn', /Matterhorn/);
    await page.waitForSelector('.maplibregl-canvas', { timeout: 60000 });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${OUT}/08-world-terrain-matterhorn.png` });
    await page.getByRole('button', { name: /Return to globe/ }).click();
    await page.waitForTimeout(1500);
    assert(await page.locator('.maplibregl-canvas').count() === 0, 'terrain view closed');
  });
}

if (want('atlas')) {
  await check('Nature Atlas: real Wikidata destinations + detail page', async () => {
    await go('atlas');
    await page.waitForSelector('[data-testid=atlas-list] li', { timeout: 90000 });
    const n = await page.locator('[data-testid=atlas-list] li').count();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/09-atlas.png` });
    await page.locator('[data-testid=atlas-list] li button').first().click();
    await page.waitForSelector('[data-testid=destination-detail]');
    assert(await page.getByRole('link', { name: /Wikidata Q\d+/ }).count() > 0, 'source link');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/10-destination-detail.png` });
    return `${n} destinations`;
  });
}

if (want('live')) {
  await check('Live navigation (emulated geolocation in test browser): track, off-route warning, GPX', async () => {
    await ctx.grantPermissions(['geolocation'], { origin: BASE });
    await ctx.setGeolocation({ latitude: 47.4582, longitude: 10.9708, accuracy: 8 });
    await go('journeys');
    await page.locator('section').filter({ hasText: 'planned' }).getByRole('button', { name: '◎' }).first().click();
    await page.click('[data-testid=gps-start]');
    for (const [la, lo] of [[47.4580, 10.9712], [47.4575, 10.9720], [47.4570, 10.9730], [47.4700, 11.0300], [47.4705, 11.0305], [47.4710, 11.0310], [47.4715, 11.0315]]) {
      await ctx.setGeolocation({ latitude: la, longitude: lo, accuracy: 8 }); await page.waitForTimeout(1200);
    }
    await page.waitForSelector('[data-testid=off-route]', { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/11-live-off-route.png` });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export GPX' }).click()]);
    const p = `test-results/track.gpx`; await dl.saveAs(p);
    return 'off-route detected; GPX exported (positions were emulated by the test harness, not real device GPS)';
  });
}

if (want('community')) {
  await check('Community: register, login, post, create event', async () => {
    await go('community');
    const email = `e2e${Date.now()}@example.org`;
    await page.getByRole('button', { name: 'Log in' }).first().click();
    await page.getByRole('button', { name: 'Register' }).first().click();
    await page.fill('input[type=email]', email); await page.fill('input[type=password]', 'e2e-password-123');
    await page.getByLabel('Display name').fill('E2E Hiker'); await page.getByLabel('Birth year').fill('1990');
    await page.locator('form').getByRole('button', { name: 'Register' }).click();
    await page.getByText('E2E Hiker').first().waitFor({ timeout: 10000 });
    await page.getByLabel('Share a hiking story…').fill('Test story from the automated suite');
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.getByText('Test story from the automated suite').waitFor();
    await page.getByRole('tab', { name: 'Events' }).click();
    await page.getByRole('button', { name: /Create event/ }).click();
    await page.getByLabel('Title').fill('E2E Eibsee walk');
    const d = new Date(Date.now() + 3 * 86400_000); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await page.getByLabel('Start time').fill(local);
    await pickPlace('ev-start', 'Eibsee', /Eibsee/);
    await page.locator('form, div').getByRole('button', { name: 'Create event' }).last().click();
    await page.getByText('E2E Eibsee walk').waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${OUT}/12-community.png` });
  });
}

if (want('studio')) {
  await check('Video Studio: render real MP4 (short timeline) and validate with ffprobe', async () => {
    await go('studio');
    await page.locator('li').filter({ hasText: /Eibsee|→/ }).getByRole('button', { name: '＋' }).first().click();
    await page.waitForSelector('[data-testid=scene]');
    const codec = await page.locator('[data-testid=codec]').innerText();
    // Shorten scenes for the test render.
    const durs = page.getByLabel('Duration');
    for (let i = 0; i < await durs.count(); i++) await durs.nth(i).fill(i === 3 ? '4' : '1.5');
    await page.waitForTimeout(800);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 2700000 }),
      (async () => { await page.click('[data-testid=render]'); await page.waitForSelector('[data-testid=render-done]', { timeout: 2700000 }); await page.getByRole('button', { name: 'Download MP4' }).click(); })(),
    ]);
    const file = 'test-results/sample-export.mp4'; await dl.saveAs(file);
    await page.screenshot({ path: `${OUT}/13-studio-render.png` });
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
    const v = probe.streams.find((s) => s.codec_type === 'video'); const a = probe.streams.find((s) => s.codec_type === 'audio');
    assert(v && v.width === 1920 && v.height === 1080, `video ${v?.width}x${v?.height}`);
    execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']); // full decode must succeed
    writeFileSync('test-results/ffprobe.json', JSON.stringify(probe, null, 2));
    return `${codec}; ffprobe: ${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${(+probe.format.duration).toFixed(2)}s, audio: ${a ? a.codec_name + ' ' + a.sample_rate + 'Hz' : 'none'}, ${(+probe.format.size / 1e6).toFixed(2)} MB, format ${probe.format.format_name}`;
  });
}

if (want('offline')) {
  await check('Offline: download region, go offline, map tiles served from cache', async () => {
    await go('offline');
    await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 }).catch(async () => { await page.reload(); await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 }); });
    await mapIdle();
    await page.getByRole('button', { name: /Download current view/ }).click();
    await page.waitForFunction(() => !document.querySelector('[data-testid=dl-progress]') && document.body.innerText.includes('complete'), null, { timeout: 300000 });
    const regionText = await page.locator('li').filter({ hasText: 'MB' }).first().innerText();
    await ctx.setOffline(true);
    const failed = []; page.on('requestfailed', (r) => { if (/openfreemap|elevation-tiles/.test(r.url())) failed.push(r.url()); });
    const ok = []; page.on('requestfinished', (r) => { if (/openfreemap|elevation-tiles/.test(r.url())) ok.push(r.url()); });
    await page.reload(); await page.waitForTimeout(9000);
    await page.screenshot({ path: `${OUT}/14-offline-map.png` });
    await ctx.setOffline(false);
    assert(ok.length > 5, `served offline: ${ok.length}, failed ${failed.length}`);
    return `${regionText.split('\n')[0]} · offline: ${ok.length} tile requests served, ${failed.length} failed (outside downloaded zoom/area)`;
  });
}

if (want('mobile')) {
  await check('Mobile layout (390×844): no horizontal overflow on key pages', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await m.newPage(); const bad = [];
    for (const h of ['home', 'planner', 'cinematic', 'live', 'atlas', 'safety', 'community', 'studio', 'settings']) {
      await p.goto(`${BASE}/#/${h}`); await p.waitForTimeout(2500);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 2) bad.push(`${h}:${over}px`);
      if (['planner', 'live', 'atlas'].includes(h)) { const mh = await p.evaluate(() => document.querySelector('[data-testid=map]')?.getBoundingClientRect().height ?? -1); if (mh < 200) bad.push(`${h}: map height ${mh}`); }
      if (['home', 'planner', 'safety'].includes(h)) await p.screenshot({ path: `${OUT}/15-mobile-${h}.png` });
    }
    await p.goto(`${BASE}/#/home`); await p.getByRole('button', { name: 'Menu' }).click(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/15-mobile-menu.png` });
    await m.close();
    assert(!bad.length, bad.join(', '));
  });
}

await check('No uncaught runtime errors', async () => { assert(errors.length === 0, errors.slice(0, 5).join(' | ')); });
await ctx.close(); await browser.close();
writeFileSync('test-results/e2e-results.json', JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
