// End-to-end test of the real stack: browser → Next.js → NestJS → PostgreSQL.
// Prerequisites: API on :4000 and web on :3000 (see README). The test reseeds the
// DEVELOPMENT database with the demo network first.
//   npm run e2e -w @ftn/web
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { deflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

let browser;
before(async () => {
  execSync('npm run db:seed -w @ftn/api', { cwd: new URL('../../..', import.meta.url).pathname, stdio: 'pipe' });
  browser = await chromium.launch();
});
after(async () => browser?.close());

async function loginAs(name, lang = 'en') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${WEB}/app`);
  await page.click(`[data-testid=lang-${lang}]`);
  await page.click(`[data-testid=demo-${name}]`);
  const outcome = await Promise.race([
    page.waitForSelector('[data-testid=graph-canvas] canvas').then(() => 'ok'),
    page.waitForSelector('.auth .error').then(async (e) => `login failed: ${await e.textContent()}`),
  ]);
  if (outcome !== 'ok') {
    throw new Error(`${outcome} — if this says "Too Many Requests", the login rate limit was hit; ` +
      'start the API with AUTH_RATE_LIMIT_PER_MINUTE=100 for repeated e2e runs (development only).');
  }
  await page.waitForFunction(() => /\d+/.test(document.querySelector('.stats strong')?.textContent ?? '') && document.querySelector('.stats strong').textContent !== '0');
  return { page, errors };
}

const stat = (page) => page.$$eval('.stats strong', (els) => els.map((e) => Number(e.textContent)));

test('central person sees all circles; filters narrow the graph', async () => {
  const { page, errors } = await loginAs('omar');
  const [people, connections] = await stat(page);
  assert.ok(people >= 20, `expected ≥20 people, got ${people}`);
  assert.ok(connections >= 28);
  await page.click('[data-testid=filter-FRIENDSHIP]');
  await page.waitForFunction((p) => Number(document.querySelector('.stats strong').textContent) < p, people);
  const [friends] = await stat(page);
  // Omar, Daniel, Hassan, Karim (Daniel's travel friend, depth 2) + Rania (Omar's own pending request, shown dashed)
  assert.equal(friends, 5);
  await page.click('[data-testid=filter-PROFESSIONAL]');
  await page.waitForFunction(() => Number(document.querySelector('.stats strong').textContent) === 3);
  await page.click('[data-testid=filter-ALL]');
  await page.click('[data-testid=layout-generations]');
  await page.click('[data-testid=gen-up]');
  assert.deepEqual(errors, []);
  await page.close();
});

test('How are we connected? shows a verified path across families', async () => {
  const { page } = await loginAs('omar');
  await page.click('[data-testid=tab-connect]');
  await page.fill('[data-testid=pick-from-input]', 'Kar');
  await page.click('.picker-results button >> nth=0');
  await page.fill('[data-testid=pick-to-input]', 'Pet');
  await page.click('.picker-results button >> nth=0');
  await page.click('[data-testid=btn-find-path]');
  await page.waitForSelector('[data-testid=path-result]');
  const chain = await page.$$eval('.chain .chain-person', (els) => els.map((e) => e.textContent));
  assert.deepEqual(chain, ['Karim', 'Daniel', 'Omar', 'Anna', 'Peter']);
  assert.match(await page.textContent('.path-verdict'), /Verified connection/);
  await page.close();
});

test('request → appears in the other person’s inbox → confirmed', async () => {
  const julia = await loginAs('julia');
  await julia.page.click('[data-testid=btn-add]');
  await julia.page.fill('[data-testid=pick-related-input]', 'Dan');
  await julia.page.click('.picker-results button >> nth=0');
  await julia.page.selectOption('[data-testid=type-select]', 'TRAVEL_FRIEND');
  await julia.page.click('[data-testid=btn-add-submit]');
  await julia.page.waitForSelector('[data-testid=add-result]');
  assert.match(await julia.page.textContent('[data-testid=add-result]'), /Proposed/);
  await julia.page.close();

  const daniel = await loginAs('daniel');
  await daniel.page.click('[data-testid=tab-inbox]');
  await daniel.page.waitForSelector('.inbox-item');
  const text = await daniel.page.textContent('.inbox-item');
  assert.match(text, /Julia/);
  await daniel.page.click('.inbox-item .btn.gold');
  await daniel.page.waitForSelector('text=Nothing to confirm');
  await daniel.page.close();
});

test('Arabic switches the whole interface to RTL; German/English are LTR', async () => {
  const { page } = await loginAs('anna', 'ar');
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.equal(await page.getAttribute('html', 'lang'), 'ar');
  assert.equal(await page.textContent('[data-testid=tab-connect]'), 'كيف نحن مرتبطون؟');
  // sidebar is on the right in RTL
  const side = await page.$eval('.sidebar', (e) => e.getBoundingClientRect().left);
  assert.ok(side > 700, `sidebar should be on the right in RTL (left=${side})`);
  await page.click('[data-testid=lang-de]');
  assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
  const sideLtr = await page.$eval('.sidebar', (e) => e.getBoundingClientRect().left);
  assert.ok(sideLtr < 50);
  await page.close();
});

test('phone width: no horizontal scrolling', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${WEB}/app`);
  await page.click('[data-testid=demo-omar]');
  await page.waitForSelector('[data-testid=graph-canvas] canvas');
  await page.evaluate(() => window.scrollTo(0, 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.equal(overflow, 0);
  await page.close();
});

test('QR: owner shows EZID ID and code; a scanner sees the person and can only send a request', async () => {
  const omar = await loginAs('omar');
  await omar.page.click('[data-testid=tab-identity]');
  await omar.page.waitForSelector('[data-testid=ezid-id]');
  assert.match(await omar.page.textContent('[data-testid=ezid-id]'), /^EZ-\d{8}$/);
  if (await omar.page.$('[data-testid=btn-qr-create]')) await omar.page.click('[data-testid=btn-qr-create]');
  await omar.page.waitForSelector('[data-testid=qr-image] svg');
  const token = await omar.page.evaluate(async () => {
    const s = JSON.parse(sessionStorage.getItem('ftn.session'));
    const r = await fetch('http://localhost:4000/api/identity/me', { headers: { authorization: `Bearer ${s.accessToken}` } });
    return (await r.json()).qr.token;
  });
  await omar.page.close();

  const julia = await loginAs('julia');
  await julia.page.goto(`${WEB}/c/${token}`);
  await julia.page.waitForSelector('[data-testid=scanned-name]');
  assert.equal(await julia.page.textContent('[data-testid=scanned-name]'), 'Omar');
  await julia.page.click('[data-testid=btn-send-request]');
  await julia.page.selectOption('[data-testid=type-select]', 'TRAVEL_FRIEND');
  await julia.page.click('[data-testid=btn-add-submit]');
  await julia.page.waitForSelector('[data-testid=add-result]');
  assert.match(await julia.page.textContent('[data-testid=add-result]'), /Proposed/);
  await julia.page.goto(`${WEB}/c/${'x'.repeat(43)}`);
  await julia.page.waitForSelector('[data-testid=qr-invalid]');
  await julia.page.close();
});

test('account: 3-step registration with consents → verify e-mail → sign out → forgot password → reset → sign in', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // phone width
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const email = `newcomer-${Date.now()}@example.test`;
  await page.goto(`${WEB}/app?mode=register`);
  await page.click('[data-testid=lang-ar]');
  await page.waitForSelector('[data-testid=register-form]');
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');

  // Step 1: next stays disabled until the passwords match and are long enough.
  await page.fill('#reg-name', 'Layla');
  await page.fill('#reg-email', email);
  await page.fill('#reg-password', 'river-stone-garden-42');
  await page.fill('#reg-password2', 'river-stone-garden-4');
  assert.equal(await page.isDisabled('[data-testid=register-next]'), true);
  await page.fill('#reg-password2', 'river-stone-garden-42');
  assert.match(await page.getAttribute('.strength', 'class'), /s3/);
  await page.click('[data-testid=register-next]');
  // Step 2: country only.
  await page.selectOption('#reg-country', 'DE');
  await page.click('[data-testid=register-next]');
  // Step 3: all three consents are required.
  await page.check('#c-terms');
  await page.check('#c-sensitive');
  assert.equal(await page.isDisabled('[data-testid=register-next]'), true);
  await page.check('#c-age');
  await page.click('[data-testid=register-next]');

  // Signed in, with the reminder to confirm the e-mail address.
  await page.waitForSelector('[data-testid=verify-banner]');
  assert.ok((await page.textContent('[data-testid=verify-banner]')).includes(email));
  await page.click('[data-testid=open-mailbox]');
  await page.waitForSelector('[data-testid=mail-link]');
  await page.click('[data-testid=mail-link]');
  await page.waitForSelector('[data-testid=verify-result].success');
  assert.equal(new URL(page.url()).search, '', 'token removed from the address bar');

  // Back in the app: banner gone; sign out ends the session.
  await page.goto(`${WEB}/app`);
  await page.waitForSelector('[data-testid=graph-canvas] canvas');
  await page.waitForTimeout(800);
  assert.equal(await page.$('[data-testid=verify-banner]'), null);
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ftn.session')).accessToken);
  await page.click('.top-actions .btn.ghost');
  await page.waitForSelector('[data-testid=login-form]');
  const after = await page.evaluate(async (t) => (await fetch('http://localhost:4000/api/auth/me', { headers: { authorization: `Bearer ${t}` } })).status, token);
  assert.equal(after, 401, 'the old token no longer works after signing out');

  // Forgot password → developer mailbox → reset page.
  await page.click('[data-testid=to-forgot]');
  await page.fill('#forgot-email', email);
  await page.click('[data-testid=forgot-form] button[type=submit]');
  await page.waitForSelector('[data-testid=forgot-form] a[href="/dev/mailbox"]');
  await page.click('[data-testid=forgot-form] a[href="/dev/mailbox"]');
  await page.waitForSelector('[data-testid=mail-link]');
  await page.click('[data-testid=mail-link] >> nth=0');
  await page.waitForSelector('[data-testid=reset-form][data-ready=true]'); // interactive (after hydration)
  await page.fill('#reset-pw', 'new-mountain-path-77');
  await page.fill('#reset-pw2', 'new-mountain-path-77');
  await page.click('[data-testid=reset-form] button[type=submit]');
  await page.waitForSelector('[data-testid=reset-done]');

  // Sign in with the new password.
  await page.goto(`${WEB}/app`);
  await page.fill('#login-email', email);
  await page.fill('#login-password', 'new-mountain-path-77');
  await page.click('[data-testid=login-form] button[type=submit]');
  await page.waitForSelector('[data-testid=graph-canvas] canvas');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `no horizontal scroll (${overflow})`);
  assert.deepEqual(errors, []);
  await page.close();
});

test('website and platform are one address: home page → Sign in / Create account → platform', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(WEB);
  await page.click('#lang-ar');
  assert.match(await page.textContent('h1'), /شخص واحد/);
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.ok(await page.$('#net-nodes g'), 'living relationship network is drawn');
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 20px "IBM Plex Sans Arabic"', 'شخص'); });
  assert.ok(fonts, 'self-hosted Arabic font loads from /site/fonts');
  // Header "Sign in" opens the platform at the same address.
  await page.click('.login-btn');
  await page.waitForSelector('[data-testid=login-form]');
  assert.equal(new URL(page.url()).pathname, '/app');
  // "Create account" opens the registration directly.
  await page.goto(WEB);
  await page.click('#open-register');
  await page.waitForSelector('[data-testid=register-form]');
  assert.deepEqual(errors, []);
  await page.close();
});

/** A small colourful PNG generated on the fly (no files needed). */
function testPng(size = 200) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = ~0; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (~c) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const o = y * (size * 3 + 1) + 1 + x * 3; raw[o] = 180; raw[o + 1] = 120 + (x % 60); raw[o + 2] = 90 + (y % 80); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('profile photo: choose → adjust → save → shown in the top bar and to family; privacy setting; remove', async () => {
  const omar = await loginAs('omar', 'ar');
  const { page } = omar;
  await page.click('[data-testid=tab-identity]');
  await page.waitForSelector('[data-testid=profile-photo]');
  await page.setInputFiles('[data-testid=photo-input]', { name: 'me.png', mimeType: 'image/png', buffer: testPng() });
  await page.waitForSelector('[data-testid=photo-editor]');
  await page.fill('[data-testid=photo-zoom]', '1.6');
  await page.click('[data-testid=photo-save]');
  await page.waitForSelector('[data-testid=photo-editor]', { state: 'detached' });
  await page.waitForFunction(() => document.querySelector('[data-testid=photo-current]')?.getAttribute('src')?.includes('/photos/'));
  await page.waitForFunction(() => document.querySelector('[data-testid=me-avatar]')?.getAttribute('src')?.includes('/photos/'));
  const loaded = await page.evaluate(() => { const i = document.querySelector('[data-testid=photo-current]'); return i.complete && i.naturalWidth; });
  assert.equal(loaded, 512, 'saved as a 512×512 photo and served back');
  assert.equal(await page.inputValue('[data-testid=photo-visibility]'), 'NETWORK');

  // Anna (family) sees Omar's photo in her graph data.
  const annaSees = async () => {
    const r = await fetch('http://localhost:4000/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'anna@demo.ftn.local', password: 'demo-password-2026' }) });
    const { accessToken, profileId } = await r.json();
    const g = await (await fetch(`http://localhost:4000/api/graph/ego?depth=1`, { headers: { authorization: `Bearer ${accessToken}` } })).json();
    return g.nodes.find((n) => n.displayName === 'Omar')?.avatarUrl ?? null;
  };
  assert.match(await annaSees(), /^\/photos\//);
  await page.selectOption('[data-testid=photo-visibility]', 'PRIVATE');
  await page.waitForTimeout(500);
  assert.equal(await annaSees(), null, 'only me: hidden from family');

  await page.click('[data-testid=photo-remove]');
  await page.waitForFunction(() => !document.querySelector('[data-testid=me-avatar]')?.getAttribute('src')?.includes('/photos/'));
  assert.deepEqual(omar.errors, []);
  await page.close();
});

test('EZIDINET WORLD: globe renders, places and all countries open their card and fly there, reduced motion, no page errors', async () => {
  const run = async (opts) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, ...opts });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${WEB}/world`);
    await page.waitForSelector('[data-testid=world-canvas]');
    await page.waitForFunction(() => Boolean(window.__ezWorld), null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    // The renderer really drew the scene (WebGL buffers cannot be read back, so use the renderer's counters).
    const drawn = await page.evaluate(() => { window.__ezWorld.renderOnce(); return window.__ezWorld.stats(); });
    assert.ok(drawn.calls > 8 && drawn.lines > 500 && drawn.points > 100, `scene drawn ${JSON.stringify(drawn)}`);
    // Heritage list → place card; tapping Sinjar on the globe also opens it.
    await page.click('[data-testid=w-heritage]');
    await page.click('[data-testid=w-place-lalish]');
    await page.waitForSelector('[data-testid=w-card]');
    assert.match(await page.textContent('[data-testid=w-card]'), /Lalish|لالش|Laliş|Lalisch/);
    await page.click('[data-testid=w-card] .w-close');
    await page.waitForTimeout(2500);
    const sp = await page.evaluate(() => window.__ezWorld.screenPosition('sinjar'));
    await page.mouse.click(sp.x, sp.y);
    await page.waitForSelector('[data-testid=w-card]');
    await page.click('[data-testid=w-card] .w-close');
    // Every country of the world: searchable list → Germany card with its Yazidi places.
    await page.click('[data-testid=w-communities]');
    await page.fill('[data-testid=w-country-search]', 'Deutschland');
    await page.click('[data-testid=w-any-DE]');
    await page.waitForSelector('[data-testid=w-country-card]');
    const de = await page.textContent('[data-testid=w-country-card]');
    assert.match(de, /Germany|Deutschland|ألمانيا|Almanya/);
    assert.match(de, /Celle|تسيله/);
    await page.click('[data-testid=w-country-card] .w-close');
    // Tapping a country on the Earth (Spain: no recorded places) opens that country.
    await page.waitForTimeout(1500);
    const es = await page.evaluate(() => window.__ezWorld.screenPositionOf(40.2, -3.7));
    await page.mouse.click(es.x, es.y);
    await page.waitForSelector('[data-testid=w-country-card]');
    assert.match(await page.textContent('[data-testid=w-country-card]'), /Spain|Spanien|إسبانيا|Spanya|Îspanya/);
    assert.deepEqual(errors, []);
    await page.close();
  };
  await run({});
  await run({ reducedMotion: 'reduce' });
});

test('EZIDINET CONNECT: two real accounts — discover, friend request, accept, presence, follow, privacy', async () => {
  const API = process.env.API_URL ?? 'http://localhost:4000/api';
  const stamp = Date.now();
  const reg = async (name) => {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `${name.toLowerCase()}-${stamp}@example.test`, password: 'connect-test-pass-2026', displayName: `${name} ${stamp}`, gender: 'UNSPECIFIED', acceptTerms: true, consentSensitiveData: true, confirmMinimumAge: true }),
    });
    assert.equal(r.status, 201);
    return { ...(await r.json()), email: `${name.toLowerCase()}-${stamp}@example.test`, name: `${name} ${stamp}` };
  };
  const A = await reg('Ronahi');
  const B = await reg('Berxwedan');
  // B chooses to be discoverable (off by default).
  await fetch(`${API}/profiles/${B.profileId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${B.accessToken}` }, body: JSON.stringify({ searchable: true }) });

  const signIn = async (u) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); // own browser context = own session
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${WEB}/app`);
    await page.click('[data-testid=lang-en]');
    await page.fill('#login-email', u.email);
    await page.fill('#login-password', 'connect-test-pass-2026');
    await page.click('[data-testid=login-form] button[type=submit]');
    await page.waitForSelector('[data-testid=tab-friends]');
    return { page, errors };
  };

  // A finds B under Discover and sends a request.
  const a = await signIn(A);
  await a.page.click('[data-testid=tab-friends]');
  await a.page.click('[data-testid=cn-discover]');
  await a.page.fill('[data-testid=cn-search]', 'Berxwedan');
  await a.page.click(`[data-testid=cn-row-${B.profileId}] .cn-who`);
  await a.page.click('[data-testid=cn-add]');
  await a.page.waitForSelector('[data-testid=cn-cancel]');

  // B sees the badge and accepts in the Requests list.
  const b = await signIn(B);
  await b.page.waitForSelector('[data-testid=friends-count]');
  assert.equal(await b.page.textContent('[data-testid=friends-count]'), '1');
  await b.page.click('[data-testid=tab-friends]');
  await b.page.click('[data-testid=cn-requests]');
  await b.page.click(`[data-testid=cn-accept-${A.profileId}]`);
  await b.page.waitForSelector(`[data-testid=cn-accept-${A.profileId}]`, { state: 'detached' });
  await b.page.click('[data-testid=cn-friends]');
  await b.page.waitForSelector(`[data-testid=cn-row-${A.profileId}]`);

  // A: B is now a friend and (being active) shows as online; A follows B.
  await a.page.click('[data-testid=cn-back]');
  await a.page.click('[data-testid=cn-friends]');
  await a.page.waitForSelector(`[data-testid=cn-row-${B.profileId}] .presence.online`);
  await a.page.click(`[data-testid=cn-row-${B.profileId}] .cn-who`);
  await a.page.waitForSelector('[data-testid=cn-are-friends]');
  await a.page.click('[data-testid=cn-follow]');
  await a.page.waitForSelector('[data-testid=cn-unfollow]');

  // B hides presence from everyone: A no longer sees it.
  await b.page.click('[data-testid=cn-settings]');
  await b.page.selectOption('[data-testid=cn-set-presenceVisibleTo]', 'NOBODY');
  await b.page.waitForSelector('[data-testid=cn-settings] .success');
  await a.page.click('[data-testid=cn-back]');
  await a.page.click(`[data-testid=cn-row-${B.profileId}] .cn-who`);
  await a.page.waitForSelector('[data-testid=cn-are-friends]');
  assert.equal(await a.page.$('[data-testid=cn-card] [data-testid=presence]'), null);

  // Arabic: the Friends area follows RTL.
  await a.page.click('[data-testid=lang-ar]');
  assert.equal(await a.page.getAttribute('.app', 'dir'), 'rtl');
  assert.match(await a.page.textContent('[data-testid=tab-friends]'), /الأصدقاء/);

  assert.deepEqual(a.errors, []);
  assert.deepEqual(b.errors, []);
  await a.page.close();
  await b.page.close();
});

test('Notification centre: two accounts — request arrives in the bell, opens Friends, acceptance notifies back, preferences', async () => {
  const API = process.env.API_URL ?? 'http://localhost:4000/api';
  const stamp = Date.now();
  const pass = 'notify-test-pass-2026';
  const reg = async (name) => {
    const email = `${name.toLowerCase()}-${stamp}@example.test`;
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: pass, displayName: `${name} ${stamp}`, gender: 'UNSPECIFIED', acceptTerms: true, consentSensitiveData: true, confirmMinimumAge: true }),
    });
    assert.equal(r.status, 201);
    return { ...(await r.json()), email };
  };
  const A = await reg('Hevi');
  const B = await reg('Zana');
  await fetch(`${API}/profiles/${B.profileId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${B.accessToken}` }, body: JSON.stringify({ searchable: true }) });
  const signIn = async (u, viewport = { width: 1440, height: 900 }) => {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${WEB}/app`);
    await page.click('[data-testid=lang-en]');
    await page.fill('#login-email', u.email);
    await page.fill('#login-password', pass);
    await page.click('[data-testid=login-form] button[type=submit]');
    await page.waitForSelector('[data-testid=nt-bell]');
    return { page, errors };
  };
  // A sends B a friend request (through the API, as the QR flow or Discover would).
  const sent = await fetch(`${API}/connect/friends/requests`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${A.accessToken}` }, body: JSON.stringify({ profileId: B.profileId }),
  });
  assert.equal(sent.status, 201);

  // B (on a phone) sees the count, opens the bell, taps the request → Friends tab.
  const b = await signIn(B, { width: 390, height: 844 });
  await b.page.waitForSelector('[data-testid=nt-count]');
  assert.equal(await b.page.textContent('[data-testid=nt-count]'), '1');
  await b.page.click('[data-testid=nt-bell]');
  assert.match(await b.page.textContent('[data-testid=nt-item-FRIEND_REQUEST]'), /sent you a friend request/);
  await b.page.click('[data-testid=nt-item-FRIEND_REQUEST]');
  await b.page.waitForSelector('[data-testid=friends-panel]');
  await b.page.waitForSelector('[data-testid=nt-count]', { state: 'detached' });
  await b.page.click('[data-testid=cn-requests]');
  await b.page.click(`[data-testid=cn-accept-${A.profileId}]`);
  assert.equal(await b.page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);

  // A gets "accepted" in Arabic, then mutes friend notifications in the preferences.
  const a = await signIn(A);
  await a.page.click('[data-testid=lang-ar]');
  await a.page.click('[data-testid=nt-bell]');
  assert.match(await a.page.textContent('[data-testid=nt-item-FRIEND_ACCEPTED]'), /قبل .* طلب صداقتك/);
  await a.page.click('[data-testid=nt-settings]');
  await a.page.uncheck('[data-testid=nt-cat-FRIENDS]');
  await a.page.waitForSelector('[data-testid=nt-prefs] .success');
  await a.page.click('[data-testid=nt-dnd-1h]');
  await a.page.waitForSelector('[data-testid=nt-dnd-on]');
  const prefs = await (await fetch(`${API}/notifications/preferences`, { headers: { authorization: `Bearer ${A.accessToken}` } })).json();
  assert.deepEqual(prefs.mutedCategories, ['FRIENDS']);
  assert.ok(new Date(prefs.dndUntil) > new Date());

  assert.deepEqual(a.errors, []);
  assert.deepEqual(b.errors, []);
  await a.page.close();
  await b.page.close();
});

test('CONNECT Home (tablet): waiting request answered on the home page, counts update, hubs navigate', async () => {
  const API = process.env.API_URL ?? 'http://localhost:4000/api';
  const stamp = Date.now();
  const pass = 'home-test-pass-2026';
  const reg = async (name) => {
    const email = `${name.toLowerCase()}-${stamp}@example.test`;
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pass, displayName: `${name} ${stamp}`, gender: 'UNSPECIFIED', acceptTerms: true, consentSensitiveData: true, confirmMinimumAge: true }) });
    assert.equal(r.status, 201);
    return { ...(await r.json()), email };
  };
  const A = await reg('Delal');
  const B = await reg('Baran');
  await fetch(`${API}/profiles/${B.profileId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${B.accessToken}` }, body: JSON.stringify({ searchable: true }) });
  const sent = await fetch(`${API}/connect/friends/requests`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${A.accessToken}` }, body: JSON.stringify({ profileId: B.profileId }) });
  assert.equal(sent.status, 201);

  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${WEB}/app`);
  await page.click('[data-testid=lang-de]');
  await page.fill('#login-email', B.email);
  await page.fill('#login-password', pass);
  await page.click('[data-testid=login-form] button[type=submit]');
  await page.click('[data-testid=area-connect]');
  await page.waitForSelector('[data-testid=cx-requests]');
  assert.match(await page.textContent('[data-testid=cx-home]'), /Willkommen/);
  assert.equal(await page.textContent('[data-testid=cx-stat-friends]'), '0');
  await page.click(`[data-testid=cx-accept-${A.profileId}]`);
  await page.waitForFunction(() => document.querySelector('[data-testid=cx-stat-friends]')?.textContent === '1');
  assert.equal(await page.$('[data-testid=cx-requests]'), null);
  await page.click('[data-testid=cx-nav-connections]');
  await page.waitForSelector(`[data-testid=cn-row-${A.profileId}]`);
  await page.click('[data-testid=cx-nav-discover]');
  await page.waitForSelector('[data-testid=cn-search]');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  // Back to the network view: the graph is still there.
  await page.click('[data-testid=area-network]');
  await page.waitForSelector('[data-testid=graph-canvas] canvas');
  assert.deepEqual(errors, []);
  await page.close();
});

test('Events & ÊZÎDÎ Calendar: organizer publishes with the form, another member registers, public page, holy-day card', async () => {
  const API = process.env.API_URL ?? 'http://localhost:4000/api';
  const stamp = Date.now();
  const pass = 'events-test-pass-2026';
  const reg = async (name) => {
    const email = `${name.toLowerCase()}-${stamp}@example.test`;
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pass, displayName: `${name} ${stamp}`, gender: 'UNSPECIFIED', acceptTerms: true, consentSensitiveData: true, confirmMinimumAge: true }) });
    assert.equal(r.status, 201);
    return { ...(await r.json()), email };
  };
  const signIn = async (u, viewport) => {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${WEB}/app`);
    await page.click('[data-testid=lang-en]');
    await page.fill('#login-email', u.email);
    await page.fill('#login-password', pass);
    await page.click('[data-testid=login-form] button[type=submit]');
    await page.click('[data-testid=area-connect]');
    return { page, errors };
  };
  const ORG = await reg('Organizer');
  const GUEST = await reg('Guest');

  // 1. Organizer (desktop) publishes through the form: the card and page are generated from it.
  const o = await signIn(ORG, { width: 1440, height: 900 });
  await o.page.click('[data-testid=cx-nav-events]');
  await o.page.click('[data-testid=ev-new]');
  await o.page.fill('#ev-title', `Heritage evening ${stamp}`);
  await o.page.fill('#ev-summary', 'Stories, music and food.');
  await o.page.selectOption('#ev-category', 'HERITAGE_EXHIBITION');
  await o.page.fill('#ev-country', 'DE');
  await o.page.fill('#ev-city', 'Bielefeld');
  await o.page.fill('#ev-venue', 'Community hall, Example street 5');
  await o.page.check('.ev-check input');
  await o.page.selectOption('#ev-registration', 'RSVP');
  await o.page.fill('#ev-capacity', '50');
  await o.page.click('[data-testid=ev-add-session]');
  const row = (await o.page.$$('fieldset.ev-repeat:first-of-type .ev-repeat-row'))[0];
  const inputs = await row.$$('input');
  await inputs[0].fill('Opening');
  await inputs[3].fill('Main stage');
  await o.page.click('[data-testid=ev-publish]');
  await o.page.waitForSelector('[data-testid=ev-detail]');
  assert.match(await o.page.textContent('[data-testid=ev-detail]'), new RegExp(`Heritage evening ${stamp}`));
  assert.match(await o.page.textContent('[data-testid=ev-schedule]'), /Opening.*Main stage/s);
  const eventId = await o.page.evaluate(async (title) => {
    const s = JSON.parse(sessionStorage.getItem('ftn.session'));
    const r = await fetch(`${location.origin.replace('3000', '4000')}/api/events?scope=mine`, { headers: { authorization: `Bearer ${s.accessToken}` } });
    return (await r.json()).items.find((e) => e.title === title).id;
  }, `Heritage evening ${stamp}`);

  // 2. Another member (phone) finds the card, opens it: the private venue is hidden until registering.
  const g = await signIn(GUEST, { width: 390, height: 844 });
  await g.page.click('[data-testid=cx-nav-events]');
  await g.page.waitForSelector(`[data-testid=ev-card-${eventId}]`);
  await g.page.click(`[data-testid=ev-open-${eventId}]`);
  await g.page.waitForSelector('[data-testid=ev-detail]');
  assert.doesNotMatch(await g.page.textContent('[data-testid=ev-detail]'), /Example street 5/);
  await g.page.click('[data-testid=ev-register]');
  await g.page.waitForSelector('[data-testid=ev-unregister]');
  assert.match(await g.page.textContent('[data-testid=ev-detail]'), /Example street 5/);
  await g.page.click('[data-testid=ev-save]');
  await g.page.waitForSelector('[data-testid=ev-save][aria-pressed=true]');
  assert.equal(await g.page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);

  // 3. Organizer is notified and sees the participant.
  await o.page.reload();
  await o.page.click('[data-testid=nt-bell]');
  await o.page.waitForSelector('[data-testid=nt-item-EVENT_REGISTRATION]');
  await o.page.click('[data-testid=nt-item-EVENT_REGISTRATION]');
  await o.page.waitForSelector('[data-testid=ev-organizer-panel]');
  assert.match(await o.page.textContent('[data-testid=ev-organizer-panel]'), new RegExp(`Guest ${stamp}`));

  // 4. Anyone can open the shared public page; the private venue stays hidden there.
  const pub = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pub.goto(`${WEB}/e/${eventId}`);
  await pub.waitForSelector('[data-testid=ev-detail]');
  assert.match(await pub.textContent('[data-testid=ev-detail]'), new RegExp(`Heritage evening ${stamp}`));
  assert.doesNotMatch(await pub.textContent('[data-testid=ev-detail]'), /Example street 5/);
  await pub.close();

  // 5. Holy-day card on CONNECT Home (needs the API started with STAFF_EMAILS=omar@demo.ftn.local).
  const staff = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'omar@demo.ftn.local', password: 'demo-password-2026' }) })).json();
  const H = { 'content-type': 'application/json', authorization: `Bearer ${staff.accessToken}` };
  const day = await fetch(`${API}/calendar/days`, { method: 'POST', headers: H, body: JSON.stringify({ slug: `e2e-${stamp}`, category: 'RELIGIOUS_HOLIDAY', template: 'RELIGIOUS', published: true, names: { ku: `Roja Testê ${stamp}`, ar: 'يوم اختبار', de: 'Testtag', en: 'Test day' } }) });
  if (day.status === 201) {
    const d = await day.json();
    const tz = await g.page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const dt = await (await fetch(`${API}/calendar/days/${d.id}/dates`, { method: 'POST', headers: H, body: JSON.stringify({ startDate: today, endDate: today }) })).json();
    await fetch(`${API}/calendar/dates/${dt.id}/verify`, { method: 'POST', headers: H, body: JSON.stringify({ verification: 'VERIFIED' }) });
    await g.page.click('[data-testid=cx-nav-home]');
    await g.page.waitForSelector(`[data-testid=ev-holiday-e2e-${stamp}]`);
    assert.match(await g.page.textContent(`[data-testid=ev-holiday-e2e-${stamp}]`), /Today/);
  } else {
    console.log('  (holy-day card part skipped: start the API with STAFF_EMAILS=omar@demo.ftn.local)');
  }

  // 6. Organizer cancels: the participant is told.
  await o.page.click('[data-testid=ev-cancel]');
  await o.page.waitForSelector('[data-testid=ev-detail] .ev-countdown.off');
  assert.deepEqual(o.errors, []);
  assert.deepEqual(g.errors, []);
  await o.page.close();
  await g.page.close();
});
