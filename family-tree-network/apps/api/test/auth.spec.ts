import request from 'supertest';
import { CONSENTS, Ctx, setup, teardown } from './helpers';

let ctx: Ctx;
beforeAll(async () => { ctx = await setup(); }, 120_000);
afterAll(async () => teardown(ctx));

const http = () => request(ctx.app.getHttpServer());
const PASSWORD = 'river-stone-garden-42';
let n = 0;
const newEmail = () => `person${Date.now()}-${++n}@example.test`;

/** The latest message in the developer mailbox for an address, and the token in its link. */
async function lastMail(to: string) {
  const res = await http().get('/api/dev/outbox');
  const msg = res.body.messages.find((m: { to: string }) => m.to === to);
  return { msg, token: msg ? new URL(msg.link).searchParams.get('token')! : null };
}

async function registerUser(extra: object = {}) {
  const email = newEmail();
  const res = await http().post('/api/auth/register').send({ email, password: PASSWORD, displayName: 'Layla', locale: 'ar', country: 'DE', ...CONSENTS, ...extra });
  return { email, res };
}

describe('registration', () => {
  it('requires all three consents', async () => {
    for (const missing of ['acceptTerms', 'consentSensitiveData', 'confirmMinimumAge']) {
      const { res } = await registerUser({ [missing]: false });
      expect(res.status).toBe(400);
    }
  });

  it('rejects weak passwords with a clear code', async () => {
    expect((await registerUser({ password: 'password123' })).res.body.code).toBe('PASSWORD_TOO_COMMON');
    const email = newEmail();
    const res = await http().post('/api/auth/register').send({ email, password: `${email.split('@')[0]}!!`, displayName: 'X', ...CONSENTS });
    expect(res.body.code).toBe('PASSWORD_CONTAINS_EMAIL');
  });

  it('only accepts a country code, never a city or address', async () => {
    expect((await registerUser({ country: 'Berlin' })).res.status).toBe(400);
  });

  it('creates account, profile, EZID ID, consent records, a session — and sends a verification e-mail', async () => {
    const { email, res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.emailVerified).toBe(false);
    expect(res.body.mailbox).toBe('developer');
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email }, include: { consents: true, sessions: true, profile: { include: { identifier: true } } } });
    expect(user.consents.map((c) => c.kind).sort()).toEqual(['AGE_MINIMUM', 'SENSITIVE_DATA', 'TERMS_PRIVACY']);
    expect(user.consents.every((c) => c.version.length > 0)).toBe(true);
    expect(user.sessions).toHaveLength(1);
    expect(user.profile!.country).toBe('DE');
    expect(user.profile!.searchable).toBe(false);
    expect(user.profile!.identifier!.ezidId).toMatch(/^EZ-\d{8}$/);
    const { msg, token } = await lastMail(email);
    expect(msg.subject).toContain('EZIDINET');
    expect(msg.link.startsWith('http://app.test/verify?token=')).toBe(true);
    // Only the hash is stored.
    const stored = await ctx.prisma.authToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).not.toContain(token!);
  });
});

describe('e-mail verification', () => {
  it('verifies once; the same link cannot be used again; resend replaces the old link', async () => {
    const { email, res } = await registerUser();
    const first = (await lastMail(email)).token!;
    const resend = await http().post('/api/auth/resend-verification').set('authorization', `Bearer ${res.body.accessToken}`);
    expect(resend.body.sent).toBe(true);
    const second = (await lastMail(email)).token!;
    expect(second).not.toBe(first);
    expect((await http().post('/api/auth/verify-email').send({ token: first })).body.code).toBe('TOKEN_INVALID');
    expect((await http().post('/api/auth/verify-email').send({ token: second })).status).toBe(200);
    expect((await http().post('/api/auth/verify-email').send({ token: second })).body.code).toBe('TOKEN_INVALID');
    const me = await http().get('/api/auth/me').set('authorization', `Bearer ${res.body.accessToken}`);
    expect(me.body.emailVerified).toBe(true);
  });

  it('expired links are refused', async () => {
    const { email } = await registerUser();
    const { token } = await lastMail(email);
    await ctx.prisma.authToken.updateMany({ where: { user: { email } }, data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2000) } });
    expect((await http().post('/api/auth/verify-email').send({ token })).body.code).toBe('TOKEN_INVALID');
  });
});

describe('login protection', () => {
  it('locks an address for 15 minutes after 5 failures — the same for unknown addresses', async () => {
    const { email } = await registerUser();
    for (const addr of [email, newEmail()]) {
      for (let i = 0; i < 5; i++) {
        expect((await http().post('/api/auth/login').send({ email: addr, password: 'wrong-password-x' })).status).toBe(401);
      }
      const locked = await http().post('/api/auth/login').send({ email: addr, password: PASSWORD });
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('TOO_MANY_ATTEMPTS');
      expect(locked.body.retryAfterSeconds).toBeGreaterThan(800);
    }
  });

  it('a successful login resets the counter', async () => {
    const { email } = await registerUser();
    for (let i = 0; i < 4; i++) await http().post('/api/auth/login').send({ email, password: 'wrong-password-x' });
    expect((await http().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(200);
    for (let i = 0; i < 4; i++) await http().post('/api/auth/login').send({ email, password: 'wrong-password-x' });
    expect((await http().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(200);
  });
});

describe('sessions and logout', () => {
  it('logout ends the session on the server; the old token stops working', async () => {
    const { res } = await registerUser();
    const auth = { authorization: `Bearer ${res.body.accessToken}` };
    expect((await http().get('/api/auth/me').set(auth)).status).toBe(200);
    expect((await http().post('/api/auth/logout').set(auth)).status).toBe(204);
    expect((await http().get('/api/auth/me').set(auth)).status).toBe(401);
  });

  it('lists sessions and logs out of all devices', async () => {
    const { email, res } = await registerUser();
    const other = await http().post('/api/auth/login').set('user-agent', 'PhoneBrowser/1.0').send({ email, password: PASSWORD });
    const a = { authorization: `Bearer ${res.body.accessToken}` };
    const b = { authorization: `Bearer ${other.body.accessToken}` };
    const list = await http().get('/api/auth/sessions').set(a);
    expect(list.body).toHaveLength(2);
    expect(list.body.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    expect(list.body.some((s: { userAgent: string }) => s.userAgent === 'PhoneBrowser/1.0')).toBe(true);
    expect((await http().post('/api/auth/logout-all').set(a)).body.endedSessions).toBe(2);
    expect((await http().get('/api/auth/me').set(a)).status).toBe(401);
    expect((await http().get('/api/auth/me').set(b)).status).toBe(401);
  });

  it('a token without a session (old format) is refused', async () => {
    const { JwtService } = await import('@nestjs/jwt');
    const jwt = ctx.app.get(JwtService);
    const user = await ctx.prisma.user.findFirstOrThrow({ include: { profile: true } });
    const legacy = await jwt.signAsync({ sub: user.id, pid: user.profile!.id });
    expect((await http().get('/api/auth/me').set('authorization', `Bearer ${legacy}`)).status).toBe(401);
  });
});

describe('forgot and reset password', () => {
  it('answers the same for known and unknown addresses; unknown addresses get no e-mail', async () => {
    const unknown = newEmail();
    const r = await http().post('/api/auth/forgot-password').send({ email: unknown });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect((await lastMail(unknown)).msg).toBeUndefined();
    const { email } = await registerUser();
    expect((await http().post('/api/auth/forgot-password').send({ email })).body).toEqual({ ok: true });
  });

  it('resets with a single-use link, signs out every device, and the new password works', async () => {
    const { email, res } = await registerUser();
    await http().post('/api/auth/forgot-password').send({ email, locale: 'de' });
    const { msg, token } = await lastMail(email);
    expect(msg.subject).toContain('Passwort');
    // A weak password is refused without using up the link.
    expect((await http().post('/api/auth/reset-password').send({ token, password: 'password123' })).body.code).toBe('PASSWORD_TOO_COMMON');
    const fresh = token!;
    const ok = await http().post('/api/auth/reset-password').send({ token: fresh, password: 'new-mountain-path-77' });
    expect(ok.status).toBe(200);
    expect((await http().get('/api/auth/me').set('authorization', `Bearer ${res.body.accessToken}`)).status).toBe(401);
    expect((await http().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(401);
    const login = await http().post('/api/auth/login').send({ email, password: 'new-mountain-path-77' });
    expect(login.status).toBe(200);
    expect(login.body.emailVerified).toBe(true);
    expect((await http().post('/api/auth/reset-password').send({ token: fresh, password: 'another-path-88x' })).body.code).toBe('TOKEN_INVALID');
  });
});

describe('change password', () => {
  it('needs the current password and signs out the other devices only', async () => {
    const { email, res } = await registerUser();
    const other = await http().post('/api/auth/login').send({ email, password: PASSWORD });
    const a = { authorization: `Bearer ${res.body.accessToken}` };
    expect((await http().post('/api/auth/change-password').set(a).send({ currentPassword: 'nope-nope-nope', newPassword: 'quiet-lake-morning-5' })).status).toBe(401);
    expect((await http().post('/api/auth/change-password').set(a).send({ currentPassword: PASSWORD, newPassword: 'quiet-lake-morning-5' })).status).toBe(200);
    expect((await http().get('/api/auth/me').set(a)).status).toBe(200);
    expect((await http().get('/api/auth/me').set('authorization', `Bearer ${other.body.accessToken}`)).status).toBe(401);
  });
});

describe('developer mailbox', () => {
  it('does not exist when e-mail transport is not "outbox"', async () => {
    const mail = ctx.app.get((await import('../src/mail/mail.service')).MailService) as { transport: string };
    const original = mail.transport;
    Object.defineProperty(mail, 'transport', { value: 'disabled', configurable: true });
    expect((await http().get('/api/dev/outbox')).status).toBe(404);
    Object.defineProperty(mail, 'transport', { value: original, configurable: true });
  });
});

describe('developer mailbox on an online server', () => {
  it('needs OUTBOX_KEY when one is configured, and the mailbox link is not offered', async () => {
    process.env.OUTBOX_KEY = 'k'.repeat(40);
    try {
      expect((await http().get('/api/dev/outbox')).status).toBe(404);
      expect((await http().get('/api/dev/outbox?key=wrong')).status).toBe(404);
      expect((await http().get(`/api/dev/outbox?key=${'k'.repeat(40)}`)).status).toBe(200);
      const { res } = await registerUser();
      expect(res.body.mailbox).toBeNull();
    } finally {
      delete process.env.OUTBOX_KEY;
    }
  });
});
