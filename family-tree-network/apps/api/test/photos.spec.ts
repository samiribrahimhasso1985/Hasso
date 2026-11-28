import { deflateSync } from 'node:zlib';
import request from 'supertest';
import { cleanImage } from '../src/photos/image-clean';
import { photoPath, verifyPhotoLink } from '../src/photos/photo-url';
import { Ctx, register, setup, teardown } from './helpers';

let ctx: Ctx;
beforeAll(async () => { ctx = await setup(); }, 120_000);
afterAll(async () => teardown(ctx));

/** Minimal valid PNG (grey square) with an optional text chunk carrying "secret" metadata. */
function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return (~c >>> 0);
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(size = 96, withText = true) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 0; // 8-bit greyscale
  const raw = Buffer.alloc((size + 1) * size, 0x88);
  for (let y = 0; y < size; y++) raw[y * (size + 1)] = 0; // filter byte
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...(withText ? [chunk('tEXt', Buffer.from('GPS\0lat=36.3,lon=41.8', 'latin1'))] : []),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const dataUrl = (b: Buffer, mime = 'image/png') => `data:${mime};base64,${b.toString('base64')}`;

describe('image cleaning', () => {
  it('keeps a valid PNG and drops text/GPS chunks', () => {
    const img = cleanImage(makePng())!;
    expect(img.mime).toBe('image/png');
    expect(img.width).toBe(96);
    expect(img.data.includes(Buffer.from('GPS'))).toBe(false);
  });
  it('drops EXIF (APP1) from a JPEG and reads its size', () => {
    const exif = Buffer.from('Exif\0\0GPSDATA\0\0', 'latin1');
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, exif.length + 2]), exif]);
    const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x00, 0x03, 0x00, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sof, Buffer.from([0xff, 0xda, 0x00, 0x02, 0x00, 0x00, 0xff, 0xd9])]);
    const img = cleanImage(jpeg)!;
    expect(img).toMatchObject({ mime: 'image/jpeg', width: 768, height: 512 });
    expect(img.data.includes(Buffer.from('GPSDATA'))).toBe(false);
  });
  it('refuses files that are not images, whatever they claim to be', () => {
    expect(cleanImage(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(cleanImage(Buffer.from('GIF89a......'))).toBeNull();
  });
});

describe('signed photo links', () => {
  it('verify only with the right signature and before expiry', () => {
    const p = photoPath('00000000-0000-4000-8000-000000000001', 'photo:3:NETWORK')!;
    const q = new URL(`http://x${p}`).searchParams;
    expect(verifyPhotoLink('00000000-0000-4000-8000-000000000001', q.get('v')!, q.get('exp')!, q.get('sig')!)).toBe(3);
    expect(verifyPhotoLink('00000000-0000-4000-8000-000000000002', q.get('v')!, q.get('exp')!, q.get('sig')!)).toBeNull();
    expect(verifyPhotoLink('00000000-0000-4000-8000-000000000001', '4', q.get('exp')!, q.get('sig')!)).toBeNull();
    expect(verifyPhotoLink('00000000-0000-4000-8000-000000000001', q.get('v')!, q.get('exp')!, q.get('sig')!, Date.now() + 3 * 3600_000)).toBeNull();
    expect(photoPath('x', null)).toBeNull();
  });
});

describe('profile photo', () => {
  it('upload → appears for people who can see the person → served by its link → delete', async () => {
    const up = await ctx.api('omar').put('/api/profiles/me/photo', { image: dataUrl(makePng()) });
    expect(up.status).toBe(200);
    expect(up.body.avatarUrl).toMatch(/^\/photos\/.+\?v=1&exp=\d+&sig=/);

    // A relative sees Omar's photo link in the graph, and the link serves the cleaned image.
    const graph = await ctx.api('anna').get(`/api/graph/ego?depth=1`);
    const omar = graph.body.nodes.find((n: { id: string }) => n.id === ctx.ids.get('omar'));
    expect(omar.avatarUrl).toMatch(/^\/photos\//);
    const img = await request(ctx.app.getHttpServer()).get(`/api${omar.avatarUrl}`);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.headers['cache-control']).toContain('private');
    expect(Buffer.from(img.body).includes(Buffer.from('GPS'))).toBe(false);

    // Tampered or old links do not work.
    expect((await request(ctx.app.getHttpServer()).get(`/api${omar.avatarUrl.replace(/sig=[^&]+/, 'sig=abc')}`)).status).toBe(404);
    const second = await ctx.api('omar').put('/api/profiles/me/photo', { image: dataUrl(makePng(128)) });
    expect(second.body.avatarUrl).toContain('v=2');
    expect((await request(ctx.app.getHttpServer()).get(`/api${omar.avatarUrl}`)).status).toBe(404);

    // Delete removes it everywhere.
    expect((await ctx.api('omar').del('/api/profiles/me/photo')).body.avatarUrl).toBeNull();
    const after = await ctx.api('anna').get(`/api/graph/ego?depth=1`);
    expect(after.body.nodes.find((n: { id: string }) => n.id === ctx.ids.get('omar')).avatarUrl).toBeNull();
    expect(await ctx.prisma.profilePhoto.count({ where: { profileId: ctx.ids.get('omar') } })).toBe(0);
  });

  it('privacy: connections by default; public / family / only me as chosen', async () => {
    await ctx.api('omar').put('/api/profiles/me/photo', { image: dataUrl(makePng()) });
    const omarId = ctx.ids.get('omar')!;
    const stranger = await register(ctx, 'Stranger');
    const seenBy = async (who: string | { token: string }) => (await ctx.api(who).get(`/api/profiles/${omarId}`)).body.avatarUrl ?? null;

    // Default NETWORK: a stranger who opens the profile gets no photo; family does; the owner sees the setting.
    expect(await seenBy({ token: stranger.token })).toBeNull();
    expect(await seenBy('anna')).toMatch(/^\/photos\//);
    expect((await ctx.api('omar').get(`/api/profiles/${omarId}`)).body.photoVisibility).toBe('NETWORK');

    // PUBLIC: the stranger sees it too.
    expect((await ctx.api('omar').patch('/api/profiles/me/photo', { visibility: 'PUBLIC' })).body.visibility).toBe('PUBLIC');
    expect(await seenBy({ token: stranger.token })).toMatch(/^\/photos\//);

    // PRIVATE: only Omar.
    await ctx.api('omar').patch('/api/profiles/me/photo', { visibility: 'PRIVATE' });
    expect(await seenBy('anna')).toBeNull();
    expect(await seenBy('omar')).toMatch(/^\/photos\//);
    const graph = await ctx.api('anna').get('/api/graph/ego?depth=1');
    expect(graph.body.nodes.find((n: { id: string }) => n.id === omarId).avatarUrl).toBeNull();

    expect((await ctx.api('omar').patch('/api/profiles/me/photo', { visibility: 'EVERYONE' })).status).toBe(400);
    await ctx.api('omar').del('/api/profiles/me/photo');
  });

  it('refuses invalid, tiny and oversized images, and anonymous uploads', async () => {
    expect((await ctx.api('anna').put('/api/profiles/me/photo', { image: 'data:image/png;base64,AAAA' })).body.code).toBe('PHOTO_INVALID');
    expect((await ctx.api('anna').put('/api/profiles/me/photo', { image: dataUrl(Buffer.from('<svg/>'), 'image/png') })).body.code).toBe('PHOTO_INVALID');
    expect((await ctx.api('anna').put('/api/profiles/me/photo', { image: dataUrl(makePng(32)) })).body.code).toBe('PHOTO_DIMENSIONS');
    const big = Buffer.concat([makePng(), Buffer.alloc(2_100_000)]);
    expect((await ctx.api('anna').put('/api/profiles/me/photo', { image: dataUrl(big) })).status).toBe(413);
    expect((await ctx.api(null).put('/api/profiles/me/photo', { image: dataUrl(makePng()) })).status).toBe(401);
  });
});
