import { Ctx, register, setup, teardown } from './helpers';
import { hashQrToken } from '../src/identity/qr-crypto';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await setup();
}, 60_000);
afterAll(() => teardown(ctx));

const id = (k: string) => ctx.ids.get(k)!;

describe('EZID ID', () => {
  it('every account holder has a unique, non-sequential EZID ID without personal data', async () => {
    const rows = await ctx.prisma.userIdentifier.findMany();
    expect(rows.length).toBeGreaterThanOrEqual(18);
    for (const r of rows) expect(r.ezidId).toMatch(/^EZ-\d{8}$/);
    expect(new Set(rows.map((r) => r.ezidId)).size).toBe(rows.length);
    const managed = await ctx.prisma.userIdentifier.findUnique({ where: { profileId: id('adam') } });
    expect(managed).toBeNull(); // children (managed profiles) get no EZID ID / QR
  });

  it('a newly registered account receives an EZID ID and is not discoverable by default', async () => {
    const u = await register(ctx, 'Newcomer');
    const me = await ctx.api(u).get('/api/identity/me');
    expect(me.status).toBe(200);
    expect(me.body.ezidId).toMatch(/^EZ-\d{8}$/);
    expect(me.body.discoverable).toBe(false);
    expect(me.body.qr).toBeNull();
    // a stranger cannot find the new person by name …
    expect((await ctx.api('julia').get('/api/profiles/search?q=Newcomer')).body).toHaveLength(0);
    // … until they opt in
    await ctx.api(u).patch('/api/identity/settings', { discoverable: true });
    expect((await ctx.api('julia').get('/api/profiles/search?q=Newcomer')).body).toHaveLength(1);
  });
});

describe('QR connection codes', () => {
  it('scanning resolves the right person with public data only, and never creates a relationship', async () => {
    const before = await ctx.prisma.relationship.count();
    const qr = await ctx.api('omar').post('/api/identity/qr', {});
    expect(qr.status).toBe(201);
    expect(qr.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const scan = await ctx.api('julia').get(`/api/qr/${qr.body.token}`);
    expect(scan.status).toBe(200);
    expect(scan.body.person.id).toBe(id('omar'));
    expect(scan.body.ezidId).toMatch(/^EZ-\d{8}$/);
    expect(scan.body.isSelf).toBe(false);
    for (const forbidden of ['birthDate', 'city', 'email', 'fullName', 'phone']) expect(scan.body.person).not.toHaveProperty(forbidden);
    expect(await ctx.prisma.relationship.count()).toBe(before);
    // the owner sees the same code again (stored encrypted, looked up by hash)
    const me = await ctx.api('omar').get('/api/identity/me');
    expect(me.body.qr.token).toBe(qr.body.token);
    const row = await ctx.prisma.qrToken.findUniqueOrThrow({ where: { tokenHash: hashQrToken(qr.body.token) } });
    expect(row.tokenEncrypted).not.toContain(qr.body.token);
  });

  it('regenerating invalidates the old code; revoking invalidates all; responses are uniform', async () => {
    const first = (await ctx.api('sara').post('/api/identity/qr', {})).body.token;
    const second = (await ctx.api('sara').post('/api/identity/qr', {})).body.token;
    const old = await ctx.api('karim').get(`/api/qr/${first}`);
    expect(old.status).toBe(404);
    expect((await ctx.api('karim').get(`/api/qr/${second}`)).status).toBe(200);
    await ctx.api('sara').del('/api/identity/qr');
    const revoked = await ctx.api('karim').get(`/api/qr/${second}`);
    const garbage = await ctx.api('karim').get(`/api/qr/${'x'.repeat(43)}`);
    expect(revoked.status).toBe(404);
    expect(revoked.body).toEqual(garbage.body); // no hint whether a code existed
    expect(revoked.body.code).toBe('QR_INVALID');
  });

  it('expired temporary codes are rejected', async () => {
    const tmp = await ctx.api('anna').post('/api/identity/qr', { kind: 'TEMPORARY', ttlMinutes: 30 });
    expect(tmp.body.expiresAt).toBeTruthy();
    expect((await ctx.api('peter').get(`/api/qr/${tmp.body.token}`)).status).toBe(200);
    await ctx.prisma.qrToken.update({ where: { tokenHash: hashQrToken(tmp.body.token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await ctx.api('peter').get(`/api/qr/${tmp.body.token}`)).status).toBe(404);
  });

  it('a person can switch off QR requests; blocked scanners are refused', async () => {
    const t = (await ctx.api('daniel').post('/api/identity/qr', {})).body.token;
    await ctx.api('daniel').patch('/api/identity/settings', { qrEnabled: false });
    expect((await ctx.api('hassan').get(`/api/qr/${t}`)).status).toBe(404);
    await ctx.api('daniel').patch('/api/identity/settings', { qrEnabled: true });
    expect((await ctx.api('hassan').get(`/api/qr/${t}`)).status).toBe(200);
    await ctx.api('daniel').post('/api/blocks', { profileId: id('hassan') });
    expect((await ctx.api('hassan').get(`/api/qr/${t}`)).status).toBe(404);
  });

  it('every scan is recorded with its real outcome for abuse detection', async () => {
    const outcomes = await ctx.prisma.qrScanEvent.groupBy({ by: ['outcome'], _count: true });
    const kinds = outcomes.map((o) => o.outcome).sort();
    expect(kinds).toEqual(expect.arrayContaining(['OK', 'REVOKED', 'INVALID', 'EXPIRED', 'DISABLED', 'BLOCKED']));
  });

  it('anonymous users cannot resolve codes; managed child profiles cannot get a QR', async () => {
    const t = (await ctx.api('elif').post('/api/identity/qr', {})).body.token;
    expect((await ctx.api(null).get(`/api/qr/${t}`)).status).toBe(401);
    const created = await ctx.prisma.qrToken.count({ where: { profileId: id('adam') } });
    expect(created).toBe(0);
  });
});
