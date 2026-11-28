import { register, setup, teardown, type Ctx } from './helpers';

/**
 * EZIDINET CONNECT — Phase 1 acceptance with real, newly registered accounts (no demo shortcuts):
 * requests (send / duplicate / accept / reject / cancel), friends, mutual friends, suggestions, followers,
 * presence, CONNECT privacy settings, blocking, and that the generic relationship endpoint respects the settings.
 */
describe('EZIDINET CONNECT — friends, followers, presence, privacy', () => {
  let ctx: Ctx;
  let A: { token: string; profileId: string };
  let B: { token: string; profileId: string };
  let C: { token: string; profileId: string };
  let D: { token: string; profileId: string };
  const as = (u: { token: string }) => ctx.api({ token: u.token });

  beforeAll(async () => {
    ctx = await setup();
    [A, B, C, D] = [await register(ctx, 'Ava'), await register(ctx, 'Ben'), await register(ctx, 'Cem'), await register(ctx, 'Dara')];
    // B and C make themselves discoverable (off by default) and show their languages publicly.
    for (const u of [B, C]) {
      expect((await as(u).patch(`/api/profiles/${u.profileId}`, { searchable: true, languages: ['ku', 'de'] })).status).toBe(200);
    }
    expect((await as(A).patch(`/api/profiles/${A.profileId}`, { languages: ['ku'] })).status).toBe(200);
  });
  afterAll(() => teardown(ctx));

  const state = async (viewer: { token: string }, id: string) => (await as(viewer).get(`/api/connect/people/${id}`)).body;

  it('sends a friend request; both sides see it; duplicates are refused', async () => {
    const sent = await as(A).post('/api/connect/friends/requests', { profileId: B.profileId });
    expect(sent.status).toBe(201);
    expect(sent.body.friendship.state).toBe('REQUEST_SENT');
    expect((await state(B, A.profileId)).friendship.state).toBe('REQUEST_RECEIVED');

    const incoming = await as(B).get('/api/connect/friends/requests?direction=incoming');
    expect(incoming.body.map((r: { person: { id: string } }) => r.person.id)).toEqual([A.profileId]);
    const outgoing = await as(A).get('/api/connect/friends/requests?direction=outgoing');
    expect(outgoing.body).toHaveLength(1);
    expect((await as(B).get('/api/connect/summary')).body.incomingRequests).toBe(1);

    expect((await as(A).post('/api/connect/friends/requests', { profileId: B.profileId })).body.code).toBe('REQUEST_EXISTS');
    const reverse = await as(B).post('/api/connect/friends/requests', { profileId: B.profileId === A.profileId ? '' : A.profileId });
    expect(reverse.status).toBe(409);
    expect(reverse.body.code).toBe('INCOMING_REQUEST');
    expect((await as(A).post('/api/connect/friends/requests', { profileId: A.profileId })).status).toBe(400);
  });

  it('only the receiver answers; accepting makes both friends (one FRIENDSHIP relationship in the graph)', async () => {
    const reqId = (await as(B).get('/api/connect/friends/requests?direction=incoming')).body[0].id;
    expect((await as(A).post(`/api/connect/friends/requests/${reqId}/accept`)).status).toBe(403);
    expect((await as(C).post(`/api/connect/friends/requests/${reqId}/accept`)).status).toBe(404);
    const ok = await as(B).post(`/api/connect/friends/requests/${reqId}/accept`);
    expect(ok.status).toBe(200);
    expect(ok.body.state).toBe('ACCEPTED');
    expect((await state(A, B.profileId)).friendship.state).toBe('FRIENDS');
    const aFriends = await as(A).get('/api/connect/friends');
    expect(aFriends.body.items.map((p: { id: string }) => p.id)).toEqual([B.profileId]);
    const rel = await as(A).get(`/api/relationships/${reqId}`);
    expect(rel.body.status).toBe('CONFIRMED');
    expect(rel.body.typeKey).toBe('FRIEND');
  });

  it('the sender can cancel a waiting request; the receiver cannot', async () => {
    const sent = await as(A).post('/api/connect/friends/requests', { profileId: C.profileId });
    const reqId = sent.body.friendship.requestId;
    expect((await as(C).del(`/api/connect/friends/requests/${reqId}`)).status).toBe(403);
    const cancelled = await as(A).del(`/api/connect/friends/requests/${reqId}`);
    expect(cancelled.body.state).toBe('CANCELLED');
    expect((await state(A, C.profileId)).friendship.state).toBe('NONE');
    expect((await as(C).get('/api/connect/friends/requests')).body).toHaveLength(0);
  });

  it('a rejected sender waits; the other person may still reach out', async () => {
    const reqId = (await as(A).post('/api/connect/friends/requests', { profileId: C.profileId })).body.friendship.requestId;
    expect((await as(C).post(`/api/connect/friends/requests/${reqId}/reject`)).body.state).toBe('REJECTED');
    expect((await state(A, C.profileId)).friendship.state).toBe('DECLINED');
    const again = await as(A).post('/api/connect/friends/requests', { profileId: C.profileId });
    expect(again.status).toBe(429);
    expect(again.body.code).toBe('RECENTLY_DECLINED');
    // C changes their mind and sends a request themselves (the old declined one is replaced).
    const fromC = await as(C).post('/api/connect/friends/requests', { profileId: A.profileId });
    expect(fromC.status).toBe(201);
    const id = fromC.body.friendship.requestId;
    expect((await as(A).post(`/api/connect/friends/requests/${id}/reject`)).status).toBe(200);
  });

  it('mutual friends and suggestions use only friends and public languages', async () => {
    // B befriends C, so C becomes a friend-of-a-friend for A.
    const id = (await as(B).post('/api/connect/friends/requests', { profileId: C.profileId })).body.friendship.requestId;
    await as(C).post(`/api/connect/friends/requests/${id}/accept`);
    const card = await state(A, C.profileId);
    // A declined C's last request, so A may now send one (A was not the declined sender).
    expect(card.mutualFriends.count).toBe(1);
    expect(card.mutualFriends.people[0].id).toBe(B.profileId);

    const suggestions = (await as(D).get('/api/connect/discover')).body;
    expect(suggestions.map((p: { id: string }) => p.id)).not.toContain(D.profileId);
    const search = await as(D).get('/api/connect/discover?q=Cem');
    expect(search.body.map((p: { id: string }) => p.id)).toEqual([C.profileId]);
    // A (not searchable) never shows up in search.
    expect((await as(D).get('/api/connect/discover?q=Ava')).body).toHaveLength(0);
    // D shares a public language with B and C → suggested with that reason.
    await as(D).patch(`/api/profiles/${D.profileId}`, { languages: ['de'] });
    const d = (await as(D).get('/api/connect/discover')).body as { id: string; reasons: { sharedLanguages: string[] } }[];
    expect(d.find((p) => p.id === C.profileId)?.reasons.sharedLanguages).toEqual(['de']);
  });

  it('friend requests respect the receiver’s setting — also through the generic relationship endpoint', async () => {
    expect((await as(C).patch('/api/connect/settings', { friendRequestsFrom: 'NOBODY' })).status).toBe(200);
    const denied = await as(D).post('/api/connect/friends/requests', { profileId: C.profileId });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('REQUESTS_NOT_ACCEPTED');
    const viaGeneric = await as(D).post('/api/relationships', { personId: D.profileId, relatedPersonId: C.profileId, type: 'FRIEND' });
    expect(viaGeneric.status).toBe(403);

    await as(C).patch('/api/connect/settings', { friendRequestsFrom: 'FRIENDS_OF_FRIENDS' });
    expect((await as(D).post('/api/connect/friends/requests', { profileId: C.profileId })).status).toBe(403); // no mutual friend
    expect((await state(A, C.profileId)).can.sendRequest).toBe(true); // A and C share B
    expect((await as(C).patch('/api/connect/settings', { friendRequestsFrom: 'ONLY_ME' })).status).toBe(400); // not an option here
    await as(C).patch('/api/connect/settings', { friendRequestsFrom: 'EVERYONE' });
  });

  it('followers: follow, lists for the owner, setting, unfollow', async () => {
    expect((await as(D).post(`/api/connect/follows/${C.profileId}`)).body.following).toBe(true);
    expect((await as(C).get('/api/connect/followers')).body.items.map((p: { id: string }) => p.id)).toEqual([D.profileId]);
    expect((await as(D).get('/api/connect/following')).body.total).toBe(1);
    expect((await state(A, C.profileId)).followers).toBe(1);
    await as(C).patch('/api/connect/settings', { followsFrom: 'NOBODY' });
    expect((await as(A).post(`/api/connect/follows/${C.profileId}`)).body.code).toBe('FOLLOWS_NOT_ACCEPTED');
    expect((await as(D).del(`/api/connect/follows/${C.profileId}`)).body.following).toBe(false);
    expect((await as(C).get('/api/connect/followers')).body.total).toBe(0);
    await as(C).patch('/api/connect/settings', { followsFrom: 'EVERYONE' });
  });

  it('presence: friends see online/busy, others do not; invisible looks offline; last seen can be hidden', async () => {
    expect((await as(B).post('/api/connect/presence')).status).toBe(200);
    expect((await state(A, B.profileId)).presence).toEqual({ status: 'ONLINE', lastSeen: null });
    expect((await state(D, B.profileId)).presence).toBeNull(); // default: friends only
    await as(B).patch('/api/connect/settings', { statusMode: 'BUSY' });
    expect((await state(A, B.profileId)).presence.status).toBe('BUSY');
    await as(B).patch('/api/connect/settings', { statusMode: 'INVISIBLE' });
    expect((await state(A, B.profileId)).presence).toEqual({ status: 'OFFLINE', lastSeen: null });
    expect((await state(B, B.profileId)).presence.status).toBe('INVISIBLE'); // the owner sees their own mode
    // Offline with last seen, then hidden.
    await ctx.prisma.userPresence.update({ where: { profileId: B.profileId }, data: { lastActiveAt: new Date(Date.now() - 3_600_000) } });
    await as(B).patch('/api/connect/settings', { statusMode: 'ONLINE', presenceVisibleTo: 'EVERYONE' });
    const seen = (await state(D, B.profileId)).presence;
    expect(seen.status).toBe('OFFLINE');
    expect(seen.lastSeen).toBeTruthy();
    await as(B).patch('/api/connect/settings', { showLastSeen: false });
    expect((await state(D, B.profileId)).presence.lastSeen).toBeNull();
    // Friends list in A's list carries B's presence too.
    expect((await as(A).get('/api/connect/friends')).body.items[0].presence.status).toBe('OFFLINE');
  });

  it('friend lists follow their privacy setting', async () => {
    expect((await as(D).get(`/api/connect/people/${B.profileId}/friends`)).status).toBe(403); // default: friends only
    expect((await as(A).get(`/api/connect/people/${B.profileId}/friends`)).status).toBe(200);
    await as(B).patch('/api/connect/settings', { friendListVisibleTo: 'EVERYONE' });
    expect((await as(D).get(`/api/connect/people/${B.profileId}/friends`)).body.total).toBe(2);
  });

  it('blocking hides the person and stops requests and follows', async () => {
    expect((await as(C).post('/api/blocks', { profileId: D.profileId })).status).toBe(201);
    expect((await as(D).get(`/api/connect/people/${C.profileId}`)).status).toBe(404);
    expect((await as(D).post('/api/connect/friends/requests', { profileId: C.profileId })).status).toBe(404);
    expect((await as(D).post(`/api/connect/follows/${C.profileId}`)).status).toBe(404);
    expect((await as(D).get('/api/connect/discover?q=Cem')).body).toHaveLength(0);
    expect((await state(C, D.profileId)).friendship.state).toBe('BLOCKED');
  });

  it('removing a friend ends the friendship for both', async () => {
    expect((await as(B).del(`/api/connect/friends/${A.profileId}`)).body.state).toBe('NONE');
    expect((await state(A, B.profileId)).friendship.state).toBe('NONE');
    expect((await as(A).get('/api/connect/friends')).body.total).toBe(0);
  });

  it('children are protected: no stranger requests or follows', async () => {
    const child = await ctx.prisma.profile.findFirst({ where: { isMinor: true } });
    if (!child) return;
    // A child profile is not visible to strangers at all.
    expect((await as(D).post('/api/connect/friends/requests', { profileId: child.id })).status).toBe(404);
    expect((await as(D).post(`/api/connect/follows/${child.id}`)).status).toBe(404);
  });

  it('everything needs a session', async () => {
    expect((await ctx.api(null).get('/api/connect/friends')).status).toBe(401);
    expect((await ctx.api(null).post('/api/connect/presence')).status).toBe(401);
  });
});

describe('EZIDINET CONNECT — home in one request', () => {
  let ctx: Ctx;
  beforeAll(async () => { ctx = await setup(); });
  afterAll(() => teardown(ctx));

  it('shows counts, waiting requests, online friends (where allowed), suggestions and notifications', async () => {
    const [P, Q, R] = [await register(ctx, 'Home1'), await register(ctx, 'Home2'), await register(ctx, 'Home3')];
    const as = (u: { token: string }) => ctx.api({ token: u.token });
    for (const u of [P, Q, R]) await as(u).patch(`/api/profiles/${u.profileId}`, { searchable: true });
    // Q is P's friend and online; R sends P a request.
    const id = (await as(Q).post('/api/connect/friends/requests', { profileId: P.profileId })).body.friendship.requestId;
    await as(P).post(`/api/connect/friends/requests/${id}/accept`);
    await as(Q).post('/api/connect/presence');
    await as(R).post('/api/connect/friends/requests', { profileId: P.profileId });

    const home = (await as(P).get('/api/connect/home')).body;
    expect(home.displayName).toContain('Home1');
    expect(home.counts).toMatchObject({ friends: 1, incomingRequests: 1, followers: 0, following: 0 });
    expect(home.requests.map((r: { person: { id: string } }) => r.person.id)).toEqual([R.profileId]);
    expect(home.online.map((p: { id: string }) => p.id)).toEqual([Q.profileId]);
    expect(home.notifications[0].type).toBe('FRIEND_REQUEST');
    expect(home.counts.unreadNotifications).toBeGreaterThan(0);

    // Q hides presence → no longer listed as online on P's home.
    await as(Q).patch('/api/connect/settings', { presenceVisibleTo: 'NOBODY' });
    expect((await as(P).get('/api/connect/home')).body.online).toEqual([]);
    expect((await ctx.api(null).get('/api/connect/home')).status).toBe(401);
  });
});
