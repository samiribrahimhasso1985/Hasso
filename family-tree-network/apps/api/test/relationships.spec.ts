import { Ctx, register, setup, teardown } from './helpers';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await setup();
}, 60_000);
afterAll(() => teardown(ctx));

const id = (k: string) => ctx.ids.get(k)!;

describe('authentication', () => {
  it('rejects anonymous access and wrong passwords', async () => {
    expect((await ctx.api(null).get('/api/graph/ego')).status).toBe(401);
    const bad = await ctx.api(null).post('/api/auth/login', { email: 'omar@demo.ftn.local', password: 'wrong-password!' });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('registers one account = one profile, and refuses a duplicate email', async () => {
    const u = await register(ctx, 'Newcomer');
    expect(u.profileId).toBeTruthy();
    const again = await ctx.api(null).post('/api/auth/register', { email: u.email, password: 'another-password-1', displayName: 'X' });
    expect(again.status).toBe(409);
    expect(await ctx.prisma.profile.count({ where: { user: { email: u.email } } })).toBe(1);
  });

  it('validates input strictly', async () => {
    const res = await ctx.api(null).post('/api/auth/register', { email: 'not-an-email', password: 'short', displayName: '' });
    expect(res.status).toBe(400);
  });
});

describe('prototype network: one central person, many circles, no duplicates', () => {
  it("Omar's graph contains every required circle, each person exactly once", async () => {
    const res = await ctx.api('omar').get('/api/graph/ego?depth=3');
    expect(res.status).toBe(200);
    const byName = new Map<string, { kinship: { label: string } | null; generation: number | null; id: string }>(
      res.body.nodes.map((n: { displayName: string }) => [n.displayName, n]),
    );
    const k = (name: string) => byName.get(name)?.kinship?.label;
    expect(k('Khaled')).toBe('Father');
    expect(k('Layla')).toBe('Mother');
    expect(k('Sara')).toBe('Sister');
    expect(k('Anna')).toBe('Wife');
    expect(k('Adam')).toBe('Son');
    expect(k('Mila')).toBe('Daughter');
    expect(k('Zaid')).toBe('Son');
    expect(k('Mahmoud')).toBe('Uncle');
    expect(k('Karim')).toBe('First cousin');
    expect(k('Rania')).toBe('First cousin');
    expect(k('Ibrahim')).toBe('Grandfather');
    expect(k('Peter')).toBe('Father-in-law');
    const categories = new Set(res.body.edges.map((e: { category: string }) => e.category));
    for (const c of ['FAMILY', 'UNION', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL']) expect(categories).toContain(c);
    // one node per person
    const ids = res.body.nodes.map((n: { id: string }) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    // the rejected cousin claim never appears
    expect(res.body.edges.some((e: { status: string }) => e.status === 'REJECTED')).toBe(false);
  });

  it('Anna is one person in two families: the same node in the Haddad and the Weber graph', async () => {
    const haddad = await ctx.api('khaled').get(`/api/graph/ego?center=${id('omar')}&depth=1`);
    const weber = await ctx.api('peter').get(`/api/graph/ego?center=${id('peter')}&depth=1`);
    const annaA = haddad.body.nodes.find((n: { displayName: string }) => n.displayName === 'Anna');
    const annaB = weber.body.nodes.find((n: { displayName: string }) => n.displayName === 'Anna');
    expect(annaA.id).toBe(annaB.id);
    expect(await ctx.prisma.profile.count({ where: { displayName: 'Anna' } })).toBe(1);
  });

  it('people from different family communities are connected through verified relationships', async () => {
    const [karimC, peterC] = await Promise.all([
      ctx.prisma.communityMembership.findMany({ where: { profileId: id('karim') }, include: { community: true } }),
      ctx.prisma.communityMembership.findMany({ where: { profileId: id('peter') }, include: { community: true } }),
    ]);
    const shared = karimC.filter((a) => peterC.some((b) => b.communityId === a.communityId));
    expect(shared).toHaveLength(0); // no shared community …
    const res = await ctx.api('omar').get(`/api/graph/path?from=${id('karim')}&to=${id('peter')}`);
    expect(res.body.found).toBe(true); // … but a verified chain of relationships
    expect(res.body.fullyVerified).toBe(true);
    // Shortest route crosses circles: Karim's travel friend Daniel is Omar's close friend.
    const names = (b: { people: { displayName: string }[] }) => b.people.map((p) => p.displayName);
    expect(names(res.body)).toEqual(['Karim', 'Daniel', 'Omar', 'Anna', 'Peter']);
    // Restricted to family and marriage ties, the route runs through the generations.
    const fam = await ctx.api('omar').get(`/api/graph/path?from=${id('karim')}&to=${id('peter')}&categories=FAMILY,UNION`);
    expect(names(fam.body)).toEqual(['Karim', 'Mahmoud', 'Ibrahim', 'Khaled', 'Omar', 'Anna', 'Peter']);
    expect(fam.body.steps.map((s: { label: string }) => s.label)).toEqual(['Father', 'Father', 'Son', 'Son', 'Wife', 'Father']);
  });

  it('privacy bounds discovery: family-only links beyond your family horizon stay hidden', async () => {
    // Anna–Peter is FAMILY-visible; Peter is 6 family hops from Karim (horizon = 4).
    const res = await ctx.api('karim').get(`/api/graph/path?from=${id('karim')}&to=${id('peter')}`);
    expect(res.body).toEqual({ found: false, message: 'No verified connection found' });
  });

  it('children from two marriages: half-siblings, former spouse labelled as such', async () => {
    const res = await ctx.api('omar').get(`/api/graph/path?from=${id('adam')}&to=${id('zaid')}`);
    expect(res.body.kinship.label).toBe('Half-brother');
    const lina = await ctx.api('omar').get(`/api/graph/path?from=${id('omar')}&to=${id('lina')}`);
    expect(lina.body.kinship.label).toBe('Former wife');
  });

  it('labels are localised (Arabic and German)', async () => {
    const ar = await ctx.api('omar').get(`/api/graph/path?from=${id('omar')}&to=${id('rania')}&locale=ar`);
    expect(ar.body.kinship.label).toBe('ابنة الخالة');
    const de2 = await ctx.api('omar').get(`/api/graph/path?from=${id('omar')}&to=${id('peter')}&locale=de`);
    expect(de2.body.kinship.label).toBe('Schwiegervater');
  });
});

describe('relationship lifecycle and verification', () => {
  it('a request stays pending, the other side can reject it, and the rejected claim disappears', async () => {
    const created = await ctx.api('julia').post('/api/relationships', {
      personId: id('julia'), relatedPersonId: id('daniel'), type: 'FRIEND',
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');

    const inbox = await ctx.api('daniel').get('/api/relationships/awaiting-me');
    expect(inbox.body.map((r: { id: string }) => r.id)).toContain(created.body.id);

    // a third person cannot decide
    expect((await ctx.api('omar').post(`/api/relationships/${created.body.id}/decision`, { decision: 'CONFIRM' })).status).toBe(403);

    const rejected = await ctx.api('daniel').post(`/api/relationships/${created.body.id}/decision`, { decision: 'REJECT' });
    expect(rejected.body.status).toBe('REJECTED');

    const graph = await ctx.api('julia').get('/api/graph/ego?depth=1');
    expect(graph.body.edges.some((e: { id: string }) => e.id === created.body.id)).toBe(false);
    // closed for good — but a new request is possible
    expect((await ctx.api('daniel').post(`/api/relationships/${created.body.id}/decision`, { decision: 'CONFIRM' })).status).toBe(409);
    const again = await ctx.api('julia').post('/api/relationships', { personId: id('julia'), relatedPersonId: id('daniel'), type: 'FRIEND' });
    expect(again.status).toBe(201);
  });

  it('a confirmed request becomes part of verified paths', async () => {
    const before = await ctx.api('elif').get(`/api/graph/path?from=${id('elif')}&to=${id('hassan')}&categories=SOCIAL,FRIENDSHIP`);
    expect(before.body.found).toBe(true); // via Omar
    const r = await ctx.api('elif').post('/api/relationships', { personId: id('elif'), relatedPersonId: id('hassan'), type: 'ACQUAINTANCE' });
    const ok = await ctx.api('hassan').post(`/api/relationships/${r.body.id}/decision`, { decision: 'CONFIRM' });
    expect(ok.body.status).toBe('CONFIRMED');
    const after = await ctx.api('elif').get(`/api/graph/path?from=${id('elif')}&to=${id('hassan')}`);
    expect(after.body.steps).toHaveLength(1);
  });

  it('only people involved (or their stewards) can create relationships', async () => {
    const res = await ctx.api('markus').post('/api/relationships', { personId: id('sara'), relatedPersonId: id('karim'), type: 'FRIEND' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_A_PARTY');
  });

  it('structural rules are enforced with clear error codes', async () => {
    const cycle = await ctx.api('omar').post('/api/relationships', { personId: id('omar'), relatedPersonId: id('khaled'), type: 'SON' });
    expect(cycle.status).toBe(409);
    expect(cycle.body.violations.map((v: { code: string }) => v.code)).toEqual(expect.arrayContaining(['ANCESTRY_CYCLE']));
    const gender = await ctx.api('omar').post('/api/relationships', { personId: id('omar'), relatedPersonId: id('daniel'), type: 'SISTER' });
    expect(gender.body.violations.map((v: { code: string }) => v.code)).toContain('GENDER_MISMATCH');
    const dup = await ctx.api('omar').post('/api/relationships', { personId: id('omar'), relatedPersonId: id('daniel'), type: 'CLOSE_FRIEND' });
    expect(dup.body.violations[0].code).toBe('DUPLICATE_RELATIONSHIP');
    const unknown = await ctx.api('omar').post('/api/relationships', { personId: id('omar'), relatedPersonId: id('daniel'), type: 'NEMESIS' });
    expect(unknown.status).toBe(400);
  });

  it('a new baby: a single parent cannot verify parentage alone; the co-parent completes it', async () => {
    const baby = await ctx.api('omar').post('/api/profiles', { displayName: 'Nour', gender: 'FEMALE', birthDate: '2026-10-01', isMinor: true });
    expect(baby.status).toBe(201);
    const rel = await ctx.api('omar').post('/api/relationships', { personId: baby.body.id, relatedPersonId: id('omar'), type: 'FATHER' });
    expect(rel.body.status).toBe('PENDING'); // Omar speaks for both sides, but alone that is not verification
    expect((await ctx.api('anna').post(`/api/relationships/${rel.body.id}/decision`, { decision: 'CONFIRM' })).status).toBe(403);
    await ctx.api('omar').post(`/api/profiles/${baby.body.id}/stewards`, { profileId: id('anna') });
    const inbox = await ctx.api('anna').get('/api/relationships/awaiting-me');
    expect(inbox.body.map((r: { id: string }) => r.id)).toContain(rel.body.id);
    const done = await ctx.api('anna').post(`/api/relationships/${rel.body.id}/decision`, { decision: 'CONFIRM' });
    expect(done.body.status).toBe('CONFIRMED');
    // the baby is protected: never in public search
    const search = await ctx.api('markus').get('/api/profiles/search?q=Nour');
    expect(search.body).toHaveLength(0);
  });

  it('a confirmed relationship can be disputed and is then excluded from verified paths', async () => {
    const r = await ctx.prisma.relationship.findFirstOrThrow({ where: { typeKey: 'CHILDHOOD_FRIEND' } });
    const d = await ctx.api('hassan').post(`/api/relationships/${r.id}/decision`, { decision: 'DISPUTE', comment: 'We met at university' });
    expect(d.body.status).toBe('DISPUTED');
    const p = await ctx.api('hassan').get(`/api/graph/path?from=${id('hassan')}&to=${id('omar')}&categories=FRIENDSHIP`);
    expect(p.body.found).toBe(false);
    expect(p.body.message).toBe('No verified connection found');
  });

  it('relationships are independently manageable: update visibility, end a union, delete', async () => {
    const r = await ctx.prisma.relationship.findFirstOrThrow({ where: { typeKey: 'NEIGHBOR' } });
    const upd = await ctx.api('omar').patch(`/api/relationships/${r.id}`, { visibility: 'PRIVATE' });
    expect(upd.body.visibility).toBe('PRIVATE');
    expect((await ctx.api('julia').patch(`/api/relationships/${r.id}`, { visibility: 'PUBLIC' })).status).toBe(403);
    expect((await ctx.api('omar').patch(`/api/relationships/${r.id}`, { endReason: 'DIVORCE' })).status).toBe(400);
    expect((await ctx.api('elif').del(`/api/relationships/${r.id}`)).status).toBe(200);
    const audit = await ctx.prisma.auditLog.findMany({ where: { entityId: r.id }, orderBy: { id: 'asc' } });
    expect(audit.map((a) => a.action)).toEqual(['relationship.update', 'relationship.delete']);
  });
});

describe('privacy, visibility and blocking', () => {
  it('a stranger sees only public ties of Omar — no family, no children', async () => {
    const stranger = await register(ctx, 'Stranger');
    const res = await ctx.api(stranger).get(`/api/graph/ego?center=${id('omar')}&depth=2`);
    expect(res.status).toBe(200);
    const names = res.body.nodes.map((n: { displayName: string }) => n.displayName).sort();
    expect(names).toEqual(['Daniel', 'Omar']); // only the PUBLIC close-friend tie
    const child = await ctx.api(stranger).get(`/api/profiles/${id('adam')}`);
    expect(child.status).toBe(404);
    const path = await ctx.api(stranger).get(`/api/graph/path?from=${stranger.profileId}&to=${id('omar')}&locale=ar`);
    expect(path.body).toEqual({ found: false, message: 'لم يتم العثور على صلة موثّقة' });
  });

  it('field-level privacy: family sees the birth date, others do not; owners can tighten it', async () => {
    const sara = await ctx.api('sara').get(`/api/profiles/${id('omar')}`);
    expect(sara.body.birthDate).toBe('1988-04-02');
    expect(sara.body.city).toBe('Berlin');
    const julia = await ctx.api('julia').get(`/api/profiles/${id('omar')}`);
    expect(julia.body.birthDate).toBeNull();
    expect(julia.body.city).toBeNull();
    expect(julia.body.country).toBe('DE');
    await ctx.api('omar').put(`/api/profiles/${id('omar')}/privacy`, { field: 'BIRTH_DATE', visibility: 'PRIVATE' });
    expect((await ctx.api('sara').get(`/api/profiles/${id('omar')}`)).body.birthDate).toBeNull();
    expect((await ctx.api('omar').get(`/api/profiles/${id('omar')}`)).body.birthDate).toBe('1988-04-02');
  });

  it('family can see protected minors; minors never become public', async () => {
    expect((await ctx.api('sara').get(`/api/profiles/${id('adam')}`)).status).toBe(200);
    const pub = await ctx.api('omar').put(`/api/profiles/${id('adam')}/privacy`, { field: 'COUNTRY', visibility: 'PUBLIC' });
    expect(pub.body.privacy.COUNTRY).toBe('FAMILY');
  });

  it('a blocked person cannot see or request relationships with the blocker', async () => {
    expect((await ctx.api('omar').post('/api/blocks', { profileId: id('markus') })).status).toBe(201);
    expect((await ctx.api('markus').get(`/api/graph/ego?center=${id('omar')}`)).status).toBe(404);
    expect((await ctx.api('markus').get(`/api/profiles/${id('omar')}`)).status).toBe(404);
    const req = await ctx.api('markus').post('/api/relationships', { personId: id('markus'), relatedPersonId: id('omar'), type: 'FRIEND' });
    expect(req.status).toBe(403);
    const omarView = await ctx.api('omar').get('/api/graph/ego?depth=1');
    expect(omarView.body.nodes.some((n: { displayName: string }) => n.displayName === 'Markus')).toBe(false);
    await ctx.api('omar').del(`/api/blocks/${id('markus')}`);
    expect((await ctx.api('markus').get(`/api/profiles/${id('omar')}`)).status).toBe(200);
  });
});

describe('database constraints (last line of defence)', () => {
  const base = async () => ({
    typeKey: 'FRIEND',
    status: 'CONFIRMED' as const,
    visibility: 'NETWORK' as const,
    createdById: (await ctx.prisma.user.findFirstOrThrow()).id,
  });

  it('rejects self relationships', async () => {
    await expect(
      ctx.prisma.relationship.create({ data: { ...(await base()), fromProfileId: id('omar'), toProfileId: id('omar') } }),
    ).rejects.toThrow(/relationships_no_self/);
  });

  it('rejects non-canonical symmetric edges', async () => {
    const [a, b] = [id('sara'), id('karim')].sort();
    await expect(ctx.prisma.relationship.create({ data: { ...(await base()), fromProfileId: b, toProfileId: a } })).rejects.toThrow(
      /symmetric relationship/,
    );
  });

  it('rejects a second active copy of the same fact', async () => {
    const [a, b] = [id('sara'), id('karim')].sort();
    await ctx.prisma.relationship.create({ data: { ...(await base()), fromProfileId: a, toProfileId: b } });
    await expect(ctx.prisma.relationship.create({ data: { ...(await base()), fromProfileId: a, toProfileId: b } })).rejects.toThrow(
      /Unique constraint/,
    );
  });

  it('keeps the verification log append-only', async () => {
    const v = await ctx.prisma.relationshipVerification.findFirstOrThrow();
    await expect(ctx.prisma.relationshipVerification.update({ where: { id: v.id }, data: { decision: 'REJECT' } })).rejects.toThrow(
      /append-only/,
    );
  });

  it('concurrent duplicate requests produce exactly one relationship', async () => {
    const body = { personId: id('rania'), relatedPersonId: id('karim'), type: 'FRIEND' };
    const results = await Promise.all([1, 2, 3, 4].map(() => ctx.api('rania').post('/api/relationships', body)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
  });
});
