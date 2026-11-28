import { addDays, holidayPhase, localDate } from '../src/events/calendar-rules';
import { register, setup, teardown, type Ctx } from './helpers';

const day = (offset: number, tz = 'UTC') => addDays(localDate(new Date(), tz), offset);
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 3600_000).toISOString();

describe('ÊZÎDÎ Calendar — display rule (pure)', () => {
  it('shows a holy day the day before and on its day(s) only', () => {
    expect(holidayPhase('2026-04-15', '2026-04-15', '2026-04-13')).toBeNull(); // two days before
    expect(holidayPhase('2026-04-15', '2026-04-15', '2026-04-14')).toBe('TOMORROW');
    expect(holidayPhase('2026-04-15', '2026-04-15', '2026-04-15')).toBe('TODAY');
    expect(holidayPhase('2026-04-15', '2026-04-15', '2026-04-16')).toBeNull(); // after
    expect(holidayPhase('2026-10-06', '2026-10-13', '2026-10-10')).toBe('TODAY'); // every day of a multi-day feast
    expect(holidayPhase('2026-10-06', '2026-10-13', '2026-10-14')).toBeNull();
    expect(holidayPhase('2027-01-01', '2027-01-01', '2026-12-31')).toBe('TOMORROW'); // across a year
  });

  it('uses the viewer’s local date', () => {
    const instant = new Date('2026-04-14T22:30:00Z');
    expect(localDate(instant, 'UTC')).toBe('2026-04-14');
    expect(localDate(instant, 'Europe/Berlin')).toBe('2026-04-15'); // 00:30 summer time
    expect(localDate(instant, 'America/Los_Angeles')).toBe('2026-04-14');
    expect(localDate(instant, 'Not/AZone')).toBe('2026-04-14'); // unknown zone → UTC
  });
});

describe('EZIDINET Events & ÊZÎDÎ Calendar — API with real accounts', () => {
  let ctx: Ctx;
  let ORG: { token: string; profileId: string; email: string };
  let FR: { token: string; profileId: string; email: string };
  let OTHER: { token: string; profileId: string; email: string };
  let STAFF: { token: string; profileId: string; email: string };
  const as = (u: { token: string } | null) => ctx.api(u ? { token: u.token } : null);
  const base = () => ({ title: 'Cejna Êzîd evening in Celle', summary: 'Music, food and stories.', category: 'CULTURAL_FESTIVAL', startsAt: at(48), endsAt: at(52), timeZone: 'Europe/Berlin', country: 'de', city: 'Celle', publish: true });

  beforeAll(async () => {
    ctx = await setup();
    [ORG, FR, OTHER, STAFF] = [await register(ctx, 'Org'), await register(ctx, 'Friend'), await register(ctx, 'Other'), await register(ctx, 'Staff')];
    process.env.STAFF_EMAILS = STAFF.email;
    for (const u of [ORG, FR]) await as(u).patch(`/api/profiles/${u.profileId}`, { searchable: true });
    const id = (await as(FR).post('/api/connect/friends/requests', { profileId: ORG.profileId })).body.friendship.requestId;
    await as(ORG).post(`/api/connect/friends/requests/${id}/accept`);
  });
  afterAll(async () => {
    delete process.env.STAFF_EMAILS;
    await teardown(ctx);
  });

  // ── calendar ──
  let dayId: string;
  it('only staff manage the calendar; a new day is a draft until published', async () => {
    const body = { slug: 'test-feast', category: 'RELIGIOUS_HOLIDAY', template: 'RELIGIOUS', names: { ku: 'Cejna Test', ar: 'عيد تجريبي', de: 'Testfest', en: 'Test feast' } };
    expect((await as(ORG).post('/api/calendar/days', body)).status).toBe(403);
    const r = await as(STAFF).post('/api/calendar/days', body);
    expect(r.status).toBe(201);
    dayId = r.body.id;
    expect((await as(ORG).get('/api/calendar/days/test-feast')).status).toBe(404); // draft
    await as(STAFF).patch(`/api/calendar/days/${dayId}`, { published: true });
    expect((await as(ORG).get('/api/calendar/days/test-feast')).status).toBe(200);
  });

  it('only VERIFIED dates appear, the day before and on the day; two days at once both appear', async () => {
    const d = await as(STAFF).post(`/api/calendar/days/${dayId}/dates`, { startDate: day(1), endDate: day(1) });
    expect(d.body.verification).toBe('UNVERIFIED');
    expect((await as(null).get('/api/calendar/today?tz=UTC')).body.items).toHaveLength(0);
    await as(STAFF).post(`/api/calendar/dates/${d.body.id}/verify`, { verification: 'VERIFIED' });
    let t = (await as(null).get('/api/calendar/today?tz=UTC')).body;
    expect(t.items.map((x: { phase: string }) => x.phase)).toEqual(['TOMORROW']);
    expect(t.items[0].day.names.ku).toBe('Cejna Test');

    // A second day today, and one too far ahead, and one already over.
    const other = (await as(STAFF).post('/api/calendar/days', { slug: 'test-fast', category: 'FASTING', template: 'RELIGIOUS', published: true, names: { ku: 'Roji', ar: 'صوم', de: 'Fasten', en: 'Fast' } })).body.id;
    for (const [s, e] of [[day(0), day(0)], [day(2), day(2)], [day(-1), day(-1)]]) {
      const x = (await as(STAFF).post(`/api/calendar/days/${other}/dates`, { startDate: s, endDate: e })).body;
      await as(STAFF).post(`/api/calendar/dates/${x.id}/verify`, { verification: 'VERIFIED' });
    }
    t = (await as(null).get('/api/calendar/today?tz=UTC')).body;
    expect(t.items.map((x: { phase: string; day: { slug: string } }) => `${x.day.slug}:${x.phase}`).sort()).toEqual(['test-fast:TODAY', 'test-feast:TOMORROW']);
    // Past dates stay in the calendar (never deleted).
    const year = (await as(ORG).get(`/api/calendar?year=${day(-1).slice(0, 4)}`)).body;
    expect(year.days.find((x: { slug: string }) => x.slug === 'test-fast').dates.length).toBeGreaterThanOrEqual(1);
  });

  it('the time zone decides which day it is', async () => {
    const kiri = day(0, 'Pacific/Kiritimati');
    const x = (await as(STAFF).post(`/api/calendar/days/${dayId}/dates`, { startDate: kiri, endDate: kiri })).body;
    await as(STAFF).post(`/api/calendar/dates/${x.id}/verify`, { verification: 'VERIFIED' });
    const k = (await as(null).get('/api/calendar/today?tz=Pacific/Kiritimati')).body.items.filter((i: { date: { startDate: string } }) => i.date.startDate === kiri);
    expect(k.map((i: { phase: string }) => i.phase)).toEqual(['TODAY']);
    const pagoToday = localDate(new Date(), 'Pacific/Pago_Pago');
    const p = (await as(null).get('/api/calendar/today?tz=Pacific/Pago_Pago')).body.items.filter((i: { date: { startDate: string } }) => i.date.startDate === kiri);
    expect(p.map((i: { phase: string }) => i.phase)).toEqual([holidayPhase(kiri, kiri, pagoToday)].filter(Boolean));
  });

  it('a changed date is unverified again; staff can delete a wrong date', async () => {
    const x = (await as(STAFF).post(`/api/calendar/days/${dayId}/dates`, { startDate: day(30), endDate: day(30) })).body;
    await as(STAFF).post(`/api/calendar/dates/${x.id}/verify`, { verification: 'VERIFIED' });
    const changed = (await as(STAFF).patch(`/api/calendar/days/${dayId}/dates/${x.id}`, { startDate: day(31), endDate: day(31) })).body;
    expect(changed.verification).toBe('UNVERIFIED');
    expect((await as(STAFF).post(`/api/calendar/days/${dayId}/dates`, { startDate: day(5), endDate: day(4) })).status).toBe(400);
    expect((await as(ORG).del(`/api/calendar/dates/${x.id}`)).status).toBe(403);
    expect((await as(STAFF).del(`/api/calendar/dates/${x.id}`)).body.deleted).toBe(true);
  });

  // ── events ──
  let pub: string;
  it('a published public event is a card for everyone and has a public page', async () => {
    const r = await as(ORG).post('/api/events', { ...base(), calendarDayId: dayId, sessions: [{ title: 'Opening', startsAt: at(48), endsAt: at(49), stage: 'Main stage', host: 'Org' }] });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'PUBLISHED', template: 'CULTURAL', country: 'DE', canEdit: true });
    pub = r.body.id;
    const list = (await as(OTHER).get('/api/events')).body;
    expect(list.items.map((e: { id: string }) => e.id)).toContain(pub);
    const anon = await as(null).get(`/api/events/public/${pub}`);
    expect(anon.status).toBe(200);
    expect(anon.body.sessions[0].stage).toBe('Main stage');
    expect(anon.body.canEdit).toBe(false);
  });

  it('a community event keeps its own dates even after the holy day it celebrates is over', async () => {
    // test-feast had a date tomorrow; the event is two days away and stays listed regardless of the holy-day card.
    const e = (await as(OTHER).get(`/api/events/${pub}`)).body;
    expect(e.calendarDay.slug).toBe('test-feast');
    expect(new Date(e.startsAt) > new Date()).toBe(true);
  });

  it('audiences: friends-only and private events, drafts', async () => {
    const fr = (await as(ORG).post('/api/events', { ...base(), title: 'Friends dinner', audience: 'FRIENDS' })).body.id;
    const pr = (await as(ORG).post('/api/events', { ...base(), title: 'Private plan', audience: 'PRIVATE' })).body.id;
    const dr = (await as(ORG).post('/api/events', { ...base(), title: 'Draft idea', publish: false })).body.id;
    expect((await as(FR).get(`/api/events/${fr}`)).status).toBe(200);
    expect((await as(OTHER).get(`/api/events/${fr}`)).status).toBe(404);
    expect((await as(FR).get(`/api/events/${pr}`)).status).toBe(404);
    expect((await as(OTHER).get(`/api/events/${dr}`)).status).toBe(404);
    expect((await as(null).get(`/api/events/public/${fr}`)).status).toBe(404);
    const mine = (await as(ORG).get('/api/events?scope=mine')).body.items.map((e: { id: string }) => e.id);
    expect(mine).toEqual(expect.arrayContaining([pub, fr, pr, dr]));
    const others = (await as(OTHER).get('/api/events')).body.items.map((e: { id: string }) => e.id);
    expect(others).not.toEqual(expect.arrayContaining([fr]));
  });

  it('youth and fundraising events are reviewed first; staff approve; the organizer is notified', async () => {
    const y = (await as(ORG).post('/api/events', { ...base(), title: 'Youth day', category: 'YOUTH' })).body;
    expect(y.status).toBe('PENDING_REVIEW');
    expect((await as(OTHER).get(`/api/events/${y.id}`)).status).toBe(404);
    expect((await as(ORG).post(`/api/events/${y.id}/review`, { approve: true })).status).toBe(403);
    expect((await as(STAFF).get('/api/events?scope=review')).body.items.map((e: { id: string }) => e.id)).toContain(y.id);
    expect((await as(STAFF).post(`/api/events/${y.id}/review`, { approve: true })).body.status).toBe('PUBLISHED');
    expect((await as(OTHER).get(`/api/events/${y.id}`)).status).toBe(200);
    const n = (await as(ORG).get('/api/notifications')).body.items.find((x: { type: string }) => x.type === 'EVENT_APPROVED');
    expect(n.category).toBe('EVENTS');
  });

  it('registration with capacity; private venue only for participants; participant list for the organizer only', async () => {
    const e = (await as(ORG).post('/api/events', { ...base(), title: 'Small gathering', venue: 'Community hall, Main street 1', venuePublic: false, registration: 'RSVP', capacity: 1 })).body;
    expect((await as(OTHER).get(`/api/events/${e.id}`)).body).toMatchObject({ venue: null, venueHidden: true, spotsLeft: 1 });
    const reg = await as(OTHER).put(`/api/events/${e.id}/registration`);
    expect(reg.body).toMatchObject({ registered: true, venue: 'Community hall, Main street 1', spotsLeft: 0 });
    const full = await as(FR).put(`/api/events/${e.id}/registration`);
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('FULL');
    expect((await as(OTHER).get(`/api/events/${e.id}/attendees`)).status).toBe(404);
    expect((await as(ORG).get(`/api/events/${e.id}/attendees`)).body.map((p: { id: string }) => p.id)).toEqual([OTHER.profileId]);
    expect((await as(ORG).get('/api/notifications')).body.items.find((x: { type: string }) => x.type === 'EVENT_REGISTRATION')).toBeTruthy();
    expect((await as(null).get(`/api/events/public/${e.id}`)).body.venue).toBeNull();

    // Organizer moves the time → the participant is told; cancelling tells them too.
    await as(ORG).patch(`/api/events/${e.id}`, { startsAt: at(72), endsAt: at(75) });
    expect((await as(OTHER).get('/api/notifications')).body.items.find((x: { type: string }) => x.type === 'EVENT_UPDATED')).toBeTruthy();
    expect((await as(ORG).post(`/api/events/${e.id}/cancel`)).body.status).toBe('CANCELLED');
    expect((await as(OTHER).get('/api/notifications')).body.items.find((x: { type: string }) => x.type === 'EVENT_CANCELLED')).toBeTruthy();
    expect((await as(OTHER).put(`/api/events/${e.id}/registration`)).status).toBe(409);
  });

  it('save for later; only the organizer edits or deletes', async () => {
    expect((await as(OTHER).put(`/api/events/${pub}/save`)).body.saved).toBe(true);
    expect((await as(OTHER).get('/api/events?scope=saved')).body.items.map((e: { id: string }) => e.id)).toEqual([pub]);
    expect((await as(OTHER).patch(`/api/events/${pub}`, { title: 'Hijacked' })).status).toBe(404);
    expect((await as(OTHER).del(`/api/events/${pub}`)).status).toBe(404);
    expect((await as(ORG).patch(`/api/events/${pub}`, { endsAt: at(40) })).status).toBe(400); // end before start
    expect((await as(ORG).patch(`/api/events/${pub}`, { title: 'Cejna Êzîd evening' })).body.title).toBe('Cejna Êzîd evening');
  });

  it('staff can feature an event: it comes first', async () => {
    const later = (await as(ORG).post('/api/events', { ...base(), title: 'Big festival', startsAt: at(400), endsAt: at(410) })).body.id;
    expect((await as(ORG).put(`/api/events/${later}/feature`)).status).toBe(403);
    await as(STAFF).put(`/api/events/${later}/feature`);
    expect((await as(OTHER).get('/api/events')).body.items[0].id).toBe(later);
  });

  it('a blocked organizer’s events disappear; deleting removes the event', async () => {
    await as(OTHER).post('/api/blocks', { profileId: ORG.profileId });
    expect((await as(OTHER).get(`/api/events/${pub}`)).status).toBe(404);
    expect((await as(OTHER).get('/api/events')).body.items.filter((e: { organizer: { id: string } }) => e.organizer.id === ORG.profileId)).toHaveLength(0);
    expect((await as(ORG).del(`/api/events/${pub}`)).body.deleted).toBe(true);
    expect((await as(null).get(`/api/events/public/${pub}`)).status).toBe(404);
  });

  it('validation and session requirement', async () => {
    expect((await as(ORG).post('/api/events', { ...base(), category: 'PARTY' })).status).toBe(400);
    expect((await as(ORG).post('/api/events', { ...base(), onlineUrl: 'http://insecure.example' })).status).toBe(400);
    expect((await as(ORG).post('/api/events', { ...base(), timeZone: 'Mars/Base' })).status).toBe(400);
    expect((await as(null).get('/api/events')).status).toBe(401);
  });
});
