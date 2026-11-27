// End-to-end test of the real stack: browser → Next.js → NestJS → PostgreSQL.
// Prerequisites: API on :4000 and web on :3000 (see README). The test reseeds the
// DEVELOPMENT database with the demo network first.
//   npm run e2e -w @ftn/web
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

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
  await page.goto(WEB);
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
  await page.goto(WEB);
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
  await page.goto(`${WEB}/?mode=register`);
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
  await page.goto(WEB);
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
  await page.goto(WEB);
  await page.fill('#login-email', email);
  await page.fill('#login-password', 'new-mountain-path-77');
  await page.click('[data-testid=login-form] button[type=submit]');
  await page.waitForSelector('[data-testid=graph-canvas] canvas');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `no horizontal scroll (${overflow})`);
  assert.deepEqual(errors, []);
  await page.close();
});
