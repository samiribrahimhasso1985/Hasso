import { inQuietHours, minutesInZone } from '../src/notifications/notifications.service';
import { register, setup, teardown, type Ctx } from './helpers';

/**
 * Unified Notification Service with real accounts: friend and relationship requests, acceptance, followers,
 * withdrawal, read state, pagination, categories, quiet hours / do-not-disturb, blocking, ownership.
 */
describe('EZIDINET CONNECT — notification centre', () => {
  let ctx: Ctx;
  let A: { token: string; profileId: string };
  let B: { token: string; profileId: string };
  let C: { token: string; profileId: string };
  const as = (u: { token: string }) => ctx.api({ token: u.token });
  const list = async (u: { token: string }) => (await as(u).get('/api/notifications')).body;

  beforeAll(async () => {
    ctx = await setup();
    [A, B, C] = [await register(ctx, 'Nalin'), await register(ctx, 'Rezan'), await register(ctx, 'Sipan')];
    for (const u of [B, C]) await as(u).patch(`/api/profiles/${u.profileId}`, { searchable: true });
  });
  afterAll(() => teardown(ctx));

  it('a friend request notifies the receiver; cancelling withdraws it', async () => {
    const sent = await as(A).post('/api/connect/friends/requests', { profileId: B.profileId });
    const n = await list(B);
    expect(n.unread).toBe(1);
    expect(n.items[0]).toMatchObject({ category: 'FRIENDS', type: 'FRIEND_REQUEST', read: false, entityType: 'relationship' });
    expect(n.items[0].actor.id).toBe(A.profileId);
    expect((await list(A)).items).toHaveLength(0); // the sender is not notified of their own action

    await as(A).del(`/api/connect/friends/requests/${sent.body.friendship.requestId}`);
    expect((await list(B)).items).toHaveLength(0);
  });

  it('accepting marks the receiver’s notification read and tells the sender; declining tells nobody', async () => {
    const id = (await as(A).post('/api/connect/friends/requests', { profileId: B.profileId })).body.friendship.requestId;
    await as(B).post(`/api/connect/friends/requests/${id}/accept`);
    const b = await list(B);
    expect(b.unread).toBe(0);
    expect(b.items[0].read).toBe(true);
    const a = await list(A);
    expect(a.items[0]).toMatchObject({ type: 'FRIEND_ACCEPTED', category: 'FRIENDS' });
    expect(a.items[0].actor.id).toBe(B.profileId);

    const id2 = (await as(A).post('/api/connect/friends/requests', { profileId: C.profileId })).body.friendship.requestId;
    await as(C).post(`/api/connect/friends/requests/${id2}/reject`);
    expect((await list(A)).items.filter((x: { type: string }) => x.type === 'FRIEND_ACCEPTED')).toHaveLength(1);
  });

  it('other relationship requests use the RELATIONSHIPS category (one service for both)', async () => {
    const r = await as(C).post('/api/relationships', { personId: C.profileId, relatedPersonId: A.profileId, type: 'COLLEAGUE' });
    expect(r.status).toBe(201);
    const n = (await list(A)).items.find((x: { type: string }) => x.type === 'RELATIONSHIP_REQUEST');
    expect(n).toMatchObject({ category: 'RELATIONSHIPS', entityId: r.body.id });
    await as(A).post(`/api/relationships/${r.body.id}/decision`, { decision: 'CONFIRM' });
    expect((await list(C)).items.find((x: { type: string }) => x.type === 'RELATIONSHIP_CONFIRMED')).toBeTruthy();
  });

  it('a follow notifies once (repeat = same notification), unfollow withdraws it', async () => {
    await as(A).post(`/api/connect/follows/${C.profileId}`);
    await as(A).del(`/api/connect/follows/${C.profileId}`);
    expect((await list(C)).items.filter((x: { type: string }) => x.type === 'NEW_FOLLOWER')).toHaveLength(0);
    await as(A).post(`/api/connect/follows/${C.profileId}`);
    await as(A).post(`/api/connect/follows/${C.profileId}`);
    expect((await list(C)).items.filter((x: { type: string }) => x.type === 'NEW_FOLLOWER')).toHaveLength(1);
  });

  it('read one, read all, delete; nobody can touch someone else’s notifications', async () => {
    const c = await list(C);
    expect(c.unread).toBeGreaterThan(0);
    const first = c.items.find((x: { read: boolean }) => !x.read);
    expect((await as(A).post(`/api/notifications/${first.id}/read`)).status).toBe(404);
    expect((await as(A).del(`/api/notifications/${first.id}`)).status).toBe(404);
    const r = await as(C).post(`/api/notifications/${first.id}/read`);
    expect(r.body.unread).toBe(c.unread - 1);
    expect((await as(C).post('/api/notifications/read-all')).body.unread).toBe(0);
    expect((await as(C).get('/api/notifications/unread-count')).body.unread).toBe(0);
    expect((await as(C).del(`/api/notifications/${first.id}`)).body.deleted).toBe(true);
  });

  it('a muted category creates nothing; do-not-disturb makes notifications silent', async () => {
    await as(C).patch('/api/notifications/preferences', { mutedCategories: ['FOLLOWS'] });
    await as(B).post(`/api/connect/follows/${C.profileId}`);
    expect((await list(C)).items.find((x: { type: string; actor: { id: string } }) => x.type === 'NEW_FOLLOWER' && x.actor.id === B.profileId)).toBeUndefined();

    await as(C).patch('/api/notifications/preferences', { mutedCategories: [], dndMinutes: 60 });
    const prefs = (await as(C).get('/api/notifications/preferences')).body;
    expect(new Date(prefs.dndUntil).getTime()).toBeGreaterThan(Date.now());
    await as(B).del(`/api/connect/follows/${C.profileId}`);
    await as(B).post(`/api/connect/follows/${C.profileId}`);
    const n = (await list(C)).items.find((x: { type: string; actor: { id: string } }) => x.type === 'NEW_FOLLOWER' && x.actor.id === B.profileId);
    expect(n.silent).toBe(true);
    await as(C).patch('/api/notifications/preferences', { dndMinutes: null });
  });

  it('validates preferences', async () => {
    expect((await as(C).patch('/api/notifications/preferences', { mutedCategories: ['NOPE'] })).status).toBe(400);
    expect((await as(C).patch('/api/notifications/preferences', { quietStart: 2000 })).status).toBe(400);
    expect((await as(C).patch('/api/notifications/preferences', { timeZone: 'Mars/Base' })).status).toBe(400);
    const ok = await as(C).patch('/api/notifications/preferences', { quietStart: 22 * 60, quietEnd: 7 * 60, timeZone: 'Europe/Berlin' });
    expect(ok.body).toMatchObject({ quietStart: 1320, quietEnd: 420, timeZone: 'Europe/Berlin' });
  });

  it('quiet hours work across midnight and in the member’s time zone', () => {
    expect(inQuietHours(22 * 60, 7 * 60, 23 * 60)).toBe(true);
    expect(inQuietHours(22 * 60, 7 * 60, 6 * 60)).toBe(true);
    expect(inQuietHours(22 * 60, 7 * 60, 12 * 60)).toBe(false);
    expect(inQuietHours(9 * 60, 17 * 60, 10 * 60)).toBe(true);
    expect(inQuietHours(null, null, 10 * 60)).toBe(false);
    expect(minutesInZone(new Date('2026-06-01T10:30:00Z'), 'Europe/Berlin')).toBe(12 * 60 + 30); // summer time
    expect(minutesInZone(new Date('2026-06-01T10:30:00Z'), 'Bad/Zone')).toBe(10 * 60 + 30);
  });

  it('a blocked person cannot notify', async () => {
    await as(B).post('/api/blocks', { profileId: A.profileId });
    const before = (await list(B)).items.length;
    await as(A).post(`/api/connect/follows/${B.profileId}`); // refused anyway (hidden), and no notification
    expect((await list(B)).items.length).toBe(before);
  });

  it('pagination by cursor and the session requirement', async () => {
    const page = await list(C);
    expect(page.next === null || typeof page.next === 'string').toBe(true);
    expect((await as(C).get('/api/notifications?before=not-a-date')).status).toBe(400);
    expect((await ctx.api(null).get('/api/notifications')).status).toBe(401);
  });
});
