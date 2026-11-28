// @vitest-environment node
/**
 * Server integration tests: social API permissions enforced server-side (in-memory SQLite).
 * Calls the handler table directly, the same code the HTTP server uses.
 */
import { describe, it, expect, beforeAll } from 'vitest';
// @ts-expect-error — plain ESM server module
import { openDb, createSocial, hashPassword, verifyPassword } from '../server/social.mjs';

type Out = { status?: number; data: any; cookie?: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
let S: ReturnType<typeof createSocial>;
let ip = 0;
async function call(method: string, path: string, me: unknown, body: Record<string, unknown> = {}, query: Record<string, string> = {}): Promise<Out> {
  const h = S.match(method, path); if (!h) throw new Error('no route ' + path);
  return h.fn({ me, body, query, params: h.params, ip: `10.0.0.${ip++ % 250}` });
}
async function expectErr(p: Promise<unknown>, code: string) { await expect(p).rejects.toMatchObject({ code }); }
async function user(email: string, birthYear = 1990) {
  await call('POST', '/api/auth/register', null, { email, password: 'correct horse battery', displayName: email.split('@')[0], birthYear });
  const r = await call('POST', '/api/auth/login', null, { email, password: 'correct horse battery' });
  return S.sessionUser(r.cookie!)!;
}

describe('social API', () => {
  let alice: any, bob: any, carol: any, kid: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  beforeAll(async () => {
    S = createSocial(openDb(':memory:'));
    alice = await user('alice@example.org'); bob = await user('bob@example.org'); carol = await user('carol@example.org');
    kid = await user('kid@example.org', new Date().getFullYear() - 15);
  });

  it('password hashing', () => { const h = hashPassword('x'.repeat(12)); expect(verifyPassword('x'.repeat(12), h)).toBe(true); expect(verifyPassword('y'.repeat(12), h)).toBe(false); });
  it('registration validation', async () => {
    await expectErr(call('POST', '/api/auth/register', null, { email: 'a@example.org', password: 'short', displayName: 'A', birthYear: 1990 }), 'invalid_password');
    await expectErr(call('POST', '/api/auth/register', null, { email: 'alice@example.org', password: 'long enough pw', displayName: 'Al', birthYear: 1990 }), 'email_taken');
    await expectErr(call('POST', '/api/auth/register', null, { email: 'b@example.org', password: 'long enough pw', displayName: 'Bb', birthYear: new Date().getFullYear() - 10 }), 'age_requirement');
    await expectErr(call('POST', '/api/auth/login', null, { email: 'alice@example.org', password: 'wrong password!' }), 'invalid_credentials');
  });
  it('private info is never exposed', async () => {
    const r = await call('GET', '/api/users/:id'.replace(':id', String(alice.id)), bob);
    expect(r.data.email).toBeUndefined(); expect(r.data.displayName).toBe('alice');
    const self = await call('GET', `/api/users/${alice.id}`, alice); expect(self.data.email).toBe('alice@example.org');
    // Minors are private by default.
    expect((await call('GET', `/api/users/${kid.id}`, bob)).data.private).toBe(true);
  });
  it('follow / unfollow and follower lists', async () => {
    await call('POST', `/api/users/${alice.id}/follow`, bob);
    expect((await call('GET', `/api/users/${alice.id}/followers`, carol)).data.items.map((x: { id: number }) => x.id)).toEqual([bob.id]);
    await call('DELETE', `/api/users/${alice.id}/follow`, bob);
    expect((await call('GET', `/api/users/${alice.id}/followers`, carol)).data.items).toEqual([]);
    await call('POST', `/api/users/${alice.id}/follow`, bob);
  });
  it('post visibility: public / followers / private', async () => {
    for (const v of ['public', 'followers', 'private']) await call('POST', '/api/posts', alice, { text: `vis ${v}`, visibility: v });
    const texts = async (me: unknown) => (await call('GET', '/api/feed', me, {}, { scope: 'all' })).data.items.filter((p: { author: { id: number } }) => p.author.id === alice.id).map((p: { text: string }) => p.text);
    expect(await texts(bob)).toEqual(['vis followers', 'vis public']); // bob follows alice
    expect(await texts(carol)).toEqual(['vis public']);
    expect(await texts(null)).toEqual(['vis public']);
    expect(await texts(alice)).toEqual(['vis private', 'vis followers', 'vis public']);
  });
  it('comments, reactions, bookmarks and comment moderation by post author', async () => {
    const p = (await call('POST', '/api/posts', alice, { text: 'summit!', visibility: 'public' })).data;
    const c = (await call('POST', `/api/posts/${p.id}/comments`, carol, { text: 'nice' })).data;
    await call('POST', `/api/posts/${p.id}/reactions`, carol, { kind: 'summit' });
    await call('POST', `/api/posts/${p.id}/bookmark`, carol);
    const got = (await call('GET', `/api/posts/${p.id}`, carol)).data;
    expect(got.comments).toBe(1); expect(got.reactions).toBe(1); expect(got.myReaction).toBe('summit'); expect(got.bookmarked).toBe(true);
    await expectErr(call('DELETE', `/api/comments/${c.id}`, bob), 'forbidden');
    await call('DELETE', `/api/comments/${c.id}`, alice); // post author removes comment
    expect((await call('GET', `/api/posts/${p.id}`, carol)).data.comments).toBe(0);
    await expectErr(call('DELETE', `/api/posts/${p.id}`, bob), 'forbidden');
  });
  it('GPS route needs consent; endpoints trimmed', async () => {
    const route = Array.from({ length: 50 }, (_, i) => [11 + i * 0.0005, 47]);
    await expectErr(call('POST', '/api/posts', alice, { text: 'r', visibility: 'public', route }), 'route_consent_required');
    const p = (await call('POST', '/api/posts', alice, { text: 'r', visibility: 'public', route, routeConsent: true })).data;
    expect(p.route.length).toBeLessThan(route.length);
    expect(p.route[0][0]).toBeGreaterThan(11.002); // ~300 m trimmed
  });
  it('blocking hides content and prevents interaction', async () => {
    const p = (await call('POST', '/api/posts', carol, { text: 'carol public', visibility: 'public' })).data;
    await call('POST', `/api/users/${carol.id}/block`, bob);
    await expectErr(call('GET', `/api/posts/${p.id}`, bob), 'not_found');
    await expectErr(call('POST', `/api/users/${carol.id}/follow`, bob), 'blocked');
    await call('DELETE', `/api/users/${carol.id}/block`, bob);
  });
  it('reporting', async () => {
    expect((await call('POST', '/api/reports', bob, { targetType: 'user', targetId: carol.id, reason: 'spam spam' })).status).toBe(201);
    await expectErr(call('GET', '/api/admin/reports', bob), 'forbidden');
  });
  it('events: create, join request, accept, capacity, leave, cancel', async () => {
    const startsAt = new Date(Date.now() + 2 * 86400_000).toISOString();
    const ev = (await call('POST', '/api/events', alice, { title: 'Eibsee loop', start: { name: 'Eibsee', lon: 10.97, lat: 47.458 }, startsAt, maxParticipants: 2, durationH: 3 })).data;
    expect(ev.accepted).toBe(1);
    await call('POST', `/api/events/${ev.id}/join`, bob);
    await call('POST', `/api/events/${ev.id}/join`, carol);
    await expectErr(call('POST', `/api/events/${ev.id}/respond`, bob, { userId: carol.id, accept: true }), 'forbidden');
    await call('POST', `/api/events/${ev.id}/respond`, alice, { userId: bob.id, accept: true });
    await expectErr(call('POST', `/api/events/${ev.id}/respond`, alice, { userId: carol.id, accept: true }), 'event_full');
    await expectErr(call('GET', `/api/events/${ev.id}/participants`, carol), 'participants_only');
    expect((await call('GET', `/api/events/${ev.id}/participants`, bob)).data.items).toHaveLength(2);
    await expectErr(call('POST', `/api/events/${ev.id}/join`, kid), 'adults_only');
    await expectErr(call('POST', '/api/events', kid, { title: 'kid event', start: { lon: 1, lat: 1 }, startsAt }), 'minors_cannot_organize');
    await call('POST', `/api/events/${ev.id}/leave`, bob);
    await call('POST', `/api/events/${ev.id}/cancel`, alice);
    expect((await call('GET', `/api/events/${ev.id}`, alice)).data.status).toBe('cancelled');
  });
  it('live location: consent required, organizer-only view, revocation', async () => {
    const startsAt = new Date(Date.now() - 600_000).toISOString(); // started 10 min ago
    const ev = (await call('POST', '/api/events', alice, { title: 'Live hike', start: { lon: 10.97, lat: 47.458 }, startsAt, durationH: 4 })).data;
    await call('POST', `/api/events/${ev.id}/join`, bob); await call('POST', `/api/events/${ev.id}/respond`, alice, { userId: bob.id, accept: true });
    await expectErr(call('POST', `/api/events/${ev.id}/live`, bob, { lon: 10.98, lat: 47.46 }), 'consent_required');
    await expectErr(call('POST', `/api/events/${ev.id}/live`, carol, { consent: true, lon: 10.98, lat: 47.46 }), 'participants_only');
    await call('POST', `/api/events/${ev.id}/live`, bob, { consent: true, lon: 10.98, lat: 47.46, acc: 6 });
    expect((await call('GET', `/api/events/${ev.id}/live`, alice)).data.participants[0].lat).toBe(47.46);
    const mine = (await call('GET', `/api/events/${ev.id}/live`, bob)).data;
    expect(mine.participants).toBeUndefined(); expect(mine.mine).toBeTruthy();
    await call('DELETE', `/api/events/${ev.id}/live`, bob);
    expect((await call('GET', `/api/events/${ev.id}/live`, alice)).data.participants).toEqual([]);
    // Community map never contains user positions.
    const map = (await call('GET', '/api/community/map', carol)).data.items;
    expect(JSON.stringify(map)).not.toContain('47.46,');
  });
  it('groups: private requires invite, roles, moderation', async () => {
    const g = (await call('POST', '/api/groups', alice, { name: 'Alpine Adventures', visibility: 'private' })).data;
    await expectErr(call('POST', `/api/groups/${g.id}/join`, bob), 'invite_required');
    expect((await call('GET', `/api/groups/${g.id}`, bob)).data.restricted).toBe(true);
    await call('POST', `/api/groups/${g.id}/invite`, alice, { userId: bob.id });
    await call('POST', `/api/groups/${g.id}/join`, bob);
    await call('POST', `/api/posts`, bob, { text: 'group post', visibility: 'public', groupId: g.id });
    expect((await call('GET', '/api/feed', carol, {}, { groupId: String(g.id) })).data.items).toHaveLength(0); // non-member
    expect((await call('GET', '/api/feed', bob, {}, { groupId: String(g.id) })).data.items).toHaveLength(1);
    await expectErr(call('POST', `/api/groups/${g.id}/role`, bob, { userId: bob.id, role: 'moderator' }), 'forbidden');
    await call('POST', `/api/groups/${g.id}/remove`, alice, { userId: bob.id });
    await expectErr(call('POST', '/api/posts', bob, { text: 'x', visibility: 'public', groupId: g.id }), 'not_group_member');
  });
  it('notifications and preferences', async () => {
    const n = (await call('GET', '/api/notifications', alice)).data;
    expect(n.items.some((x: { kind: string }) => x.kind === 'follow')).toBe(true);
    expect(n.items.some((x: { kind: string }) => x.kind === 'join_request')).toBe(true);
    await call('PUT', '/api/notifications/prefs', carol, { follow: false });
    await call('POST', `/api/users/${carol.id}/follow`, alice);
    expect((await call('GET', '/api/notifications', carol)).data.items.some((x: { kind: string }) => x.kind === 'follow')).toBe(false);
  });
  it('media signature is checked', async () => {
    await expectErr(call('POST', '/api/posts', alice, { text: 'x', visibility: 'public', media: ['data:image/png;base64,' + Buffer.from('not a png').toString('base64')] }), 'media_signature_mismatch');
  });
  it('rate limits writes', async () => {
    const tasks = [];
    for (let i = 0; i < 40; i++) tasks.push(Promise.resolve().then(() => S.match('POST', '/api/posts')!.fn({ me: carol, body: { text: 'spam ' + i, visibility: 'private' }, query: {}, params: {}, ip: 'same' })).catch((e: { code: string }) => e.code));
    expect((await Promise.all(tasks)).filter((x) => x === 'rate_limited').length).toBeGreaterThan(0);
  });
  it('auth required for writes', async () => { await expectErr(call('POST', '/api/posts', null, { text: 'x', visibility: 'public' }), 'auth_required'); });
});
