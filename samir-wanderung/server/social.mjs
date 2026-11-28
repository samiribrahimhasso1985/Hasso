// Social hiking community: accounts, profiles, feed, groups, events, live sharing, moderation.
// Every permission is checked here on the server; the frontend only mirrors it.
import { createRequire } from 'node:module';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { HttpError, RateLimiter, validLonLat, isNum } from './lib.mjs';

// node:sqlite via require so bundlers/test runners do not strip the node: prefix.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'server', 'data');
mkdirSync(join(DATA_DIR, 'media'), { recursive: true });

export function openDb(file = process.env.DB_FILE || join(DATA_DIR, 'social.db')) {
  const db = new DatabaseSync(file);
  db.exec(`
  PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL, display_name TEXT NOT NULL,
    bio TEXT DEFAULT '', country TEXT DEFAULT '', region TEXT DEFAULT '', interests TEXT DEFAULT '[]', level TEXT DEFAULT 'beginner',
    avatar TEXT, cover TEXT, profile_public INTEGER DEFAULT 1, birth_year INTEGER NOT NULL, role TEXT DEFAULT 'user', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS follows(follower INTEGER REFERENCES users(id) ON DELETE CASCADE, followee INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(follower, followee));
  CREATE TABLE IF NOT EXISTS blocks(blocker INTEGER REFERENCES users(id) ON DELETE CASCADE, blocked INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(blocker, blocked));
  CREATE TABLE IF NOT EXISTS mutes(muter INTEGER REFERENCES users(id) ON DELETE CASCADE, muted INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(muter, muted));
  CREATE TABLE IF NOT EXISTS groups_(id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', owner INTEGER REFERENCES users(id) ON DELETE CASCADE, visibility TEXT DEFAULT 'public', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS group_members(group_id INTEGER REFERENCES groups_(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, role TEXT DEFAULT 'member', PRIMARY KEY(group_id, user_id));
  CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, author INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT DEFAULT 'story', text TEXT DEFAULT '',
    visibility TEXT NOT NULL, group_id INTEGER REFERENCES groups_(id) ON DELETE CASCADE, media TEXT DEFAULT '[]', route TEXT, stats TEXT, hide_endpoints INTEGER DEFAULT 1, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, author INTEGER REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reactions(post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, PRIMARY KEY(post_id, user_id));
  CREATE TABLE IF NOT EXISTS bookmarks(post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(post_id, user_id));
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, organizer INTEGER REFERENCES users(id) ON DELETE CASCADE, group_id INTEGER REFERENCES groups_(id) ON DELETE SET NULL,
    title TEXT NOT NULL, description TEXT DEFAULT '', start_name TEXT, start_lon REAL NOT NULL, start_lat REAL NOT NULL, dest_name TEXT, dest_lon REAL, dest_lat REAL,
    route TEXT, starts_at TEXT NOT NULL, duration_h REAL, difficulty TEXT, max_participants INTEGER DEFAULT 10, equipment TEXT DEFAULT '', visibility TEXT DEFAULT 'public',
    adults_only INTEGER DEFAULT 1, status TEXT DEFAULT 'active', country TEXT DEFAULT '', distance_km REAL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS participants(event_id INTEGER REFERENCES events(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL, PRIMARY KEY(event_id, user_id));
  CREATE TABLE IF NOT EXISTS event_updates(id INTEGER PRIMARY KEY, event_id INTEGER REFERENCES events(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS live_shares(event_id INTEGER REFERENCES events(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lon REAL, lat REAL, acc REAL, updated_at TEXT, expires_at TEXT NOT NULL, PRIMARY KEY(event_id, user_id));
  CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, reporter INTEGER REFERENCES users(id) ON DELETE CASCADE, target_type TEXT NOT NULL, target_id INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT DEFAULT 'open', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, data TEXT NOT NULL, read INTEGER DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS notif_prefs(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, prefs TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id, created_at DESC);
  `);
  return db;
}

const now = () => new Date().toISOString();
const hashToken = (t) => createHash('sha256').update(t).digest('hex');
const VIS = ['public', 'followers', 'private'];
const NOTIF_KINDS = ['follow', 'comment', 'reaction', 'group_invite', 'join_request', 'join_accepted', 'event_changed', 'event_upcoming'];
const str = (v, max, field, min = 0) => {
  if (typeof v !== 'string') throw new HttpError(400, `invalid_${field}`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw new HttpError(400, `invalid_${field}`);
  return s;
};

export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(pw, salt, 64).toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [, salt, hash] = stored.split('$');
  const a = scryptSync(pw, Buffer.from(salt, 'hex'), 64), b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSocial(db) {
  const writeLimiter = new RateLimiter(30, 0.5); // 30 burst, 1 action / 2 s sustained
  const authLimiter = new RateLimiter(8, 0.05);
  const q = (sql) => db.prepare(sql);

  const isMinor = (u) => new Date().getFullYear() - u.birth_year < 18;
  const blockedEither = (a, b) => !!q('SELECT 1 FROM blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)').get(a, b, b, a);
  const follows = (a, b) => !!q('SELECT 1 FROM follows WHERE follower=? AND followee=?').get(a, b);
  const user = (id) => q('SELECT * FROM users WHERE id=?').get(id);

  function notify(userId, kind, data) {
    const prefs = JSON.parse(q('SELECT prefs FROM notif_prefs WHERE user_id=?').get(userId)?.prefs ?? '{}');
    if (prefs[kind] === false) return;
    q('INSERT INTO notifications(user_id, kind, data, created_at) VALUES(?,?,?,?)').run(userId, kind, JSON.stringify(data), now());
  }

  function publicUser(u, viewerId) {
    const self = viewerId === u.id;
    const visible = self || u.profile_public || (viewerId && follows(viewerId, u.id));
    const base = { id: u.id, displayName: u.display_name, avatar: u.avatar ? `/api/media/${u.avatar}` : null };
    if (!visible) return { ...base, private: true };
    return {
      ...base, bio: u.bio, country: u.country, region: u.region, interests: JSON.parse(u.interests), level: u.level,
      cover: u.cover ? `/api/media/${u.cover}` : null, profilePublic: !!u.profile_public,
      followers: q('SELECT COUNT(*) c FROM follows WHERE followee=?').get(u.id).c,
      following: q('SELECT COUNT(*) c FROM follows WHERE follower=?').get(u.id).c,
      completedJourneys: q("SELECT COUNT(*) c FROM posts WHERE author=? AND kind='journey'").get(u.id).c,
      ...(self ? { email: u.email, minor: isMinor(u) } : {}),
      ...(viewerId && !self ? { isFollowing: follows(viewerId, u.id) } : {}),
    };
  }

  function canSeePost(p, viewerId) {
    if (viewerId === p.author) return true;
    if (viewerId && blockedEither(viewerId, p.author)) return false;
    if (p.group_id) {
      const g = q('SELECT * FROM groups_ WHERE id=?').get(p.group_id);
      if (g?.visibility === 'private' && !(viewerId && q('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?').get(p.group_id, viewerId))) return false;
    }
    if (p.visibility === 'public') return true;
    if (p.visibility === 'followers') return !!viewerId && follows(viewerId, p.author);
    return false;
  }

  function serializePost(p, viewerId) {
    const route = p.route ? JSON.parse(p.route) : null;
    return {
      id: p.id, kind: p.kind, text: p.text, visibility: p.visibility, groupId: p.group_id, createdAt: p.created_at,
      author: publicUser(user(p.author), viewerId),
      media: JSON.parse(p.media).map((m) => `/api/media/${m}`),
      // Exact endpoints are trimmed server-side when the author asked to hide them.
      route, stats: p.stats ? JSON.parse(p.stats) : null,
      reactions: q('SELECT COUNT(*) c FROM reactions WHERE post_id=?').get(p.id).c,
      comments: q('SELECT COUNT(*) c FROM comments WHERE post_id=?').get(p.id).c,
      myReaction: viewerId ? q('SELECT kind FROM reactions WHERE post_id=? AND user_id=?').get(p.id, viewerId)?.kind ?? null : null,
      bookmarked: viewerId ? !!q('SELECT 1 FROM bookmarks WHERE post_id=? AND user_id=?').get(p.id, viewerId) : false,
    };
  }

  /** Trim ~300 m from each end of a shared route so a home address is not revealed. */
  function trimRoute(coords, hide) {
    if (!Array.isArray(coords) || coords.length < 2 || coords.length > 20000) throw new HttpError(400, 'invalid_route');
    for (const c of coords) if (!Array.isArray(c) || !validLonLat(c[0], c[1])) throw new HttpError(400, 'invalid_route');
    if (!hide) return coords;
    const dist = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110540);
    let s = 0, acc = 0; while (s < coords.length - 2 && acc < 300) { acc += dist(coords[s], coords[s + 1]); s++; }
    let e = coords.length - 1; acc = 0; while (e > s + 1 && acc < 300) { acc += dist(coords[e], coords[e - 1]); e--; }
    return coords.slice(s, e + 1);
  }

  function saveMedia(dataUrl) {
    if (typeof dataUrl !== 'string') throw new HttpError(400, 'invalid_media');
    const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp)|video\/(?:mp4|webm));base64,(.+)$/);
    if (!m) throw new HttpError(400, 'unsupported_media_type');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 12 * 1024 * 1024) throw new HttpError(413, 'media_too_large');
    // Check magic bytes so the declared type cannot be spoofed.
    const sig = buf.subarray(0, 12).toString('hex');
    const ok = (m[1] === 'image/jpeg' && sig.startsWith('ffd8ff')) || (m[1] === 'image/png' && sig.startsWith('89504e47'))
      || (m[1] === 'image/webp' && sig.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP')
      || (m[1] === 'video/mp4' && buf.subarray(4, 8).toString() === 'ftyp') || (m[1] === 'video/webm' && sig.startsWith('1a45dfa3'));
    if (!ok) throw new HttpError(400, 'media_signature_mismatch');
    const id = randomBytes(16).toString('hex') + '.' + m[1].split('/')[1];
    writeFileSync(join(DATA_DIR, 'media', id), buf);
    return id;
  }

  /** Media is only served if the viewer may see something that references it. */
  function mediaAllowed(id, viewerId) {
    if (q('SELECT 1 FROM users WHERE avatar=? OR cover=?').get(id, id)) return true;
    const posts = q('SELECT * FROM posts WHERE media LIKE ?').all(`%"${id}"%`);
    return posts.some((p) => canSeePost(p, viewerId));
  }

  function eventVisibleTo(ev, viewerId) {
    if (ev.organizer === viewerId) return true;
    if (viewerId && blockedEither(viewerId, ev.organizer)) return false;
    if (ev.visibility === 'public') return true;
    return !!viewerId && !!q("SELECT 1 FROM participants WHERE event_id=? AND user_id=? AND status IN ('accepted','invited','requested')").get(ev.id, viewerId);
  }

  function serializeEvent(ev, viewerId) {
    const accepted = q("SELECT COUNT(*) c FROM participants WHERE event_id=? AND status='accepted'").get(ev.id).c;
    const mine = viewerId ? q('SELECT status FROM participants WHERE event_id=? AND user_id=?').get(ev.id, viewerId)?.status ?? null : null;
    return {
      id: ev.id, title: ev.title, description: ev.description, organizer: publicUser(user(ev.organizer), viewerId),
      start: { name: ev.start_name, lon: ev.start_lon, lat: ev.start_lat },
      destination: ev.dest_lon != null ? { name: ev.dest_name, lon: ev.dest_lon, lat: ev.dest_lat } : null,
      route: ev.route ? JSON.parse(ev.route) : null, startsAt: ev.starts_at, durationH: ev.duration_h, difficulty: ev.difficulty,
      maxParticipants: ev.max_participants, accepted, equipment: ev.equipment, visibility: ev.visibility, adultsOnly: !!ev.adults_only,
      status: ev.status, country: ev.country, distanceKm: ev.distance_km, myStatus: mine, groupId: ev.group_id,
      updates: q('SELECT text, created_at createdAt FROM event_updates WHERE event_id=? ORDER BY id DESC LIMIT 20').all(ev.id),
    };
  }

  const eventEnd = (ev) => new Date(new Date(ev.starts_at).getTime() + (ev.duration_h ?? 12) * 3600_000);
  const page = (b) => ({ limit: Math.max(1, Math.min(50, +b.limit || 20)), before: +b.before || Number.MAX_SAFE_INTEGER });

  // ---------------------------------------------------------------- handlers
  const H = {};

  H['POST /api/auth/register'] = ({ body, ip }) => {
    if (!authLimiter.take(ip)) throw new HttpError(429, 'rate_limited');
    const email = str(body.email, 200, 'email', 3).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email');
    const pw = str(body.password, 200, 'password', 10);
    const displayName = str(body.displayName, 60, 'display_name', 2);
    const by = +body.birthYear;
    const year = new Date().getFullYear();
    if (!Number.isInteger(by) || by < year - 120 || by > year - 13) throw new HttpError(400, 'age_requirement'); // 13+ only
    if (q('SELECT 1 FROM users WHERE email=?').get(email)) throw new HttpError(409, 'email_taken');
    const minor = year - by < 18;
    // Minors get a private profile by default.
    const r = q('INSERT INTO users(email, pw, display_name, birth_year, profile_public, created_at) VALUES(?,?,?,?,?,?)')
      .run(email, hashPassword(pw), displayName, by, minor ? 0 : 1, now());
    return { status: 201, data: { id: Number(r.lastInsertRowid) } };
  };

  H['POST /api/auth/login'] = ({ body, ip }) => {
    if (!authLimiter.take(ip)) throw new HttpError(429, 'rate_limited');
    const u = q('SELECT * FROM users WHERE email=?').get(String(body.email ?? '').toLowerCase().trim());
    if (!u || !verifyPassword(String(body.password ?? ''), u.pw)) throw new HttpError(401, 'invalid_credentials');
    const token = randomBytes(32).toString('base64url');
    q('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), u.id, Date.now() + 30 * 86400_000);
    return { data: { user: publicUser(u, u.id) }, cookie: token };
  };

  H['POST /api/auth/logout'] = ({ token }) => { if (token) q('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token)); return { data: { ok: true }, cookie: '' }; };
  H['GET /api/me'] = ({ me }) => ({ data: { user: me ? publicUser(me, me.id) : null } });

  H['PATCH /api/me'] = ({ me, body }) => {
    need(me);
    const f = {};
    if ('displayName' in body) f.display_name = str(body.displayName, 60, 'display_name', 2);
    if ('bio' in body) f.bio = str(body.bio, 500, 'bio');
    if ('country' in body) f.country = str(body.country, 60, 'country');
    if ('region' in body) f.region = str(body.region, 60, 'region');
    if ('level' in body) { if (!['beginner', 'intermediate', 'experienced', 'expert'].includes(body.level)) throw new HttpError(400, 'invalid_level'); f.level = body.level; }
    if ('interests' in body) { if (!Array.isArray(body.interests) || body.interests.length > 20) throw new HttpError(400, 'invalid_interests'); f.interests = JSON.stringify(body.interests.map((s) => str(s, 40, 'interest'))); }
    if ('profilePublic' in body) f.profile_public = body.profilePublic ? 1 : 0;
    if ('avatar' in body) f.avatar = saveMedia(body.avatar);
    if ('cover' in body) f.cover = saveMedia(body.cover);
    for (const [k, v] of Object.entries(f)) q(`UPDATE users SET ${k}=? WHERE id=?`).run(v, me.id); // keys are from the whitelist above
    return { data: { user: publicUser(user(me.id), me.id) } };
  };

  H['DELETE /api/me'] = ({ me, body }) => {
    need(me);
    if (!verifyPassword(String(body.password ?? ''), me.pw)) throw new HttpError(401, 'invalid_credentials');
    q('DELETE FROM users WHERE id=?').run(me.id);
    return { data: { deleted: true }, cookie: '' };
  };

  H['GET /api/users/:id'] = ({ me, params }) => {
    const u = user(+params.id);
    if (!u || (me && blockedEither(me.id, u.id))) throw new HttpError(404, 'not_found');
    return { data: publicUser(u, me?.id) };
  };

  H['GET /api/users/:id/followers'] = ({ me, params, query }) => listFollows(me, +params.id, 'followers', query);
  H['GET /api/users/:id/following'] = ({ me, params, query }) => listFollows(me, +params.id, 'following', query);
  function listFollows(me, id, which, query) {
    const u = user(id); if (!u) throw new HttpError(404, 'not_found');
    if (publicUser(u, me?.id).private) throw new HttpError(403, 'profile_private');
    const { limit } = page(query); const offset = Math.max(0, +query.offset || 0);
    const rows = which === 'followers'
      ? q('SELECT follower id FROM follows WHERE followee=? LIMIT ? OFFSET ?').all(id, limit, offset)
      : q('SELECT followee id FROM follows WHERE follower=? LIMIT ? OFFSET ?').all(id, limit, offset);
    return { data: { items: rows.map((r) => { const x = user(r.id); return { id: x.id, displayName: x.display_name }; }), nextOffset: rows.length === limit ? offset + limit : null } };
  }

  H['POST /api/users/:id/follow'] = ({ me, params }) => {
    need(me); const id = +params.id;
    if (id === me.id || !user(id)) throw new HttpError(400, 'invalid_target');
    if (blockedEither(me.id, id)) throw new HttpError(403, 'blocked');
    const r = q('INSERT OR IGNORE INTO follows VALUES(?,?)').run(me.id, id);
    if (r.changes) notify(id, 'follow', { from: me.id, name: me.display_name });
    return { data: { following: true } };
  };
  H['DELETE /api/users/:id/follow'] = ({ me, params }) => { need(me); q('DELETE FROM follows WHERE follower=? AND followee=?').run(me.id, +params.id); return { data: { following: false } }; };

  H['POST /api/users/:id/block'] = ({ me, params }) => {
    need(me); const id = +params.id; if (id === me.id || !user(id)) throw new HttpError(400, 'invalid_target');
    q('INSERT OR IGNORE INTO blocks VALUES(?,?)').run(me.id, id);
    q('DELETE FROM follows WHERE (follower=? AND followee=?) OR (follower=? AND followee=?)').run(me.id, id, id, me.id);
    return { data: { blocked: true } };
  };
  H['DELETE /api/users/:id/block'] = ({ me, params }) => { need(me); q('DELETE FROM blocks WHERE blocker=? AND blocked=?').run(me.id, +params.id); return { data: { blocked: false } }; };
  H['POST /api/users/:id/mute'] = ({ me, params }) => { need(me); q('INSERT OR IGNORE INTO mutes VALUES(?,?)').run(me.id, +params.id); return { data: { muted: true } }; };
  H['DELETE /api/users/:id/mute'] = ({ me, params }) => { need(me); q('DELETE FROM mutes WHERE muter=? AND muted=?').run(me.id, +params.id); return { data: { muted: false } }; };

  // ---- posts
  H['POST /api/posts'] = ({ me, body, ip }) => {
    need(me); limit(me, ip);
    const visibility = VIS.includes(body.visibility) ? body.visibility : null;
    if (!visibility) throw new HttpError(400, 'invalid_visibility');
    const text = str(body.text ?? '', 5000, 'text');
    const kind = ['story', 'photo', 'video', 'route', 'journey'].includes(body.kind) ? body.kind : 'story';
    let groupId = null;
    if (body.groupId != null) {
      groupId = +body.groupId;
      if (!q('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?').get(groupId, me.id)) throw new HttpError(403, 'not_group_member');
    }
    if (!Array.isArray(body.media ?? []) || (body.media ?? []).length > 6) throw new HttpError(400, 'invalid_media');
    const media = (body.media ?? []).map(saveMedia);
    let route = null;
    // A GPS route is only stored when the author explicitly consents.
    if (body.route) {
      if (body.routeConsent !== true) throw new HttpError(400, 'route_consent_required');
      route = JSON.stringify(trimRoute(body.route, body.hideEndpoints !== false));
    }
    let stats = null;
    if (body.stats) {
      const s = body.stats; const clean = {};
      for (const k of ['distanceKm', 'ascent', 'descent', 'durationH', 'maxEle']) if (isNum(s[k])) clean[k] = s[k];
      if (typeof s.highlights === 'string') clean.highlights = s.highlights.slice(0, 1000);
      stats = JSON.stringify(clean);
    }
    if (!text && !media.length && !route) throw new HttpError(400, 'empty_post');
    const r = q('INSERT INTO posts(author, kind, text, visibility, group_id, media, route, stats, hide_endpoints, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(me.id, kind, text, visibility, groupId, JSON.stringify(media), route, stats, body.hideEndpoints === false ? 0 : 1, now());
    return { status: 201, data: serializePost(q('SELECT * FROM posts WHERE id=?').get(r.lastInsertRowid), me.id) };
  };

  H['GET /api/feed'] = ({ me, query }) => {
    const { limit: lim, before } = page(query);
    const scope = query.scope === 'following' && me ? 'following' : query.scope === 'bookmarks' && me ? 'bookmarks' : query.scope === 'mine' && me ? 'mine' : 'all';
    let rows;
    const groupId = query.groupId ? +query.groupId : null;
    if (scope === 'bookmarks') rows = q('SELECT p.* FROM posts p JOIN bookmarks b ON b.post_id=p.id WHERE b.user_id=? AND p.id<? ORDER BY p.id DESC LIMIT ?').all(me.id, before, lim * 3);
    else if (scope === 'following') rows = q('SELECT * FROM posts WHERE author IN (SELECT followee FROM follows WHERE follower=?) AND id<? ORDER BY id DESC LIMIT ?').all(me.id, before, lim * 3);
    else if (scope === 'mine') rows = q('SELECT * FROM posts WHERE author=? AND id<? ORDER BY id DESC LIMIT ?').all(me.id, before, lim * 3);
    else if (groupId) rows = q('SELECT * FROM posts WHERE group_id=? AND id<? ORDER BY id DESC LIMIT ?').all(groupId, before, lim * 3);
    else rows = q('SELECT * FROM posts WHERE id<? ORDER BY id DESC LIMIT ?').all(before, lim * 3);
    const muted = me ? new Set(q('SELECT muted FROM mutes WHERE muter=?').all(me.id).map((r) => r.muted)) : new Set();
    const items = rows.filter((p) => canSeePost(p, me?.id) && !muted.has(p.author)).slice(0, lim).map((p) => serializePost(p, me?.id));
    return { data: { items, nextBefore: items.length === lim ? items.at(-1).id : null } };
  };

  const getPost = (id, me) => { const p = q('SELECT * FROM posts WHERE id=?').get(id); if (!p || !canSeePost(p, me?.id)) throw new HttpError(404, 'not_found'); return p; };
  H['GET /api/posts/:id'] = ({ me, params }) => ({ data: serializePost(getPost(+params.id, me), me?.id) });
  H['DELETE /api/posts/:id'] = ({ me, params }) => {
    need(me); const p = q('SELECT * FROM posts WHERE id=?').get(+params.id);
    if (!p) throw new HttpError(404, 'not_found');
    const groupAdmin = p.group_id && q("SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND role IN ('owner','moderator')").get(p.group_id, me.id);
    if (p.author !== me.id && !groupAdmin && me.role !== 'admin') throw new HttpError(403, 'forbidden');
    q('DELETE FROM posts WHERE id=?').run(p.id); return { data: { deleted: true } };
  };
  H['PATCH /api/posts/:id'] = ({ me, params, body }) => {
    need(me); const p = q('SELECT * FROM posts WHERE id=?').get(+params.id);
    if (!p || p.author !== me.id) throw new HttpError(403, 'forbidden');
    if (body.visibility && !VIS.includes(body.visibility)) throw new HttpError(400, 'invalid_visibility');
    if (body.visibility) q('UPDATE posts SET visibility=? WHERE id=?').run(body.visibility, p.id);
    if (typeof body.text === 'string') q('UPDATE posts SET text=? WHERE id=?').run(str(body.text, 5000, 'text'), p.id);
    return { data: serializePost(q('SELECT * FROM posts WHERE id=?').get(p.id), me.id) };
  };

  H['GET /api/posts/:id/comments'] = ({ me, params, query }) => {
    const p = getPost(+params.id, me); const { limit: lim } = page(query); const after = +query.after || 0;
    const rows = q('SELECT * FROM comments WHERE post_id=? AND id>? ORDER BY id LIMIT ?').all(p.id, after, lim)
      .filter((c) => !(me && blockedEither(me.id, c.author)));
    return { data: { items: rows.map((c) => ({ id: c.id, text: c.text, createdAt: c.created_at, author: { id: c.author, displayName: user(c.author).display_name } })), nextAfter: rows.length === lim ? rows.at(-1).id : null } };
  };
  H['POST /api/posts/:id/comments'] = ({ me, params, body, ip }) => {
    need(me); limit(me, ip); const p = getPost(+params.id, me);
    if (blockedEither(me.id, p.author)) throw new HttpError(403, 'blocked');
    const r = q('INSERT INTO comments(post_id, author, text, created_at) VALUES(?,?,?,?)').run(p.id, me.id, str(body.text, 2000, 'text', 1), now());
    if (p.author !== me.id) notify(p.author, 'comment', { postId: p.id, from: me.id, name: me.display_name });
    return { status: 201, data: { id: Number(r.lastInsertRowid) } };
  };
  H['DELETE /api/comments/:id'] = ({ me, params }) => {
    need(me); const c = q('SELECT * FROM comments WHERE id=?').get(+params.id); if (!c) throw new HttpError(404, 'not_found');
    const p = q('SELECT * FROM posts WHERE id=?').get(c.post_id);
    const groupAdmin = p.group_id && q("SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND role IN ('owner','moderator')").get(p.group_id, me.id);
    // Comment author, post author (removes inappropriate comments on own post), group moderators, admins.
    if (c.author !== me.id && p.author !== me.id && !groupAdmin && me.role !== 'admin') throw new HttpError(403, 'forbidden');
    q('DELETE FROM comments WHERE id=?').run(c.id); return { data: { deleted: true } };
  };
  H['POST /api/posts/:id/reactions'] = ({ me, params, body, ip }) => {
    need(me); limit(me, ip); const p = getPost(+params.id, me);
    const kind = ['like', 'wow', 'summit'].includes(body.kind) ? body.kind : 'like';
    q('INSERT INTO reactions VALUES(?,?,?) ON CONFLICT(post_id,user_id) DO UPDATE SET kind=excluded.kind').run(p.id, me.id, kind);
    if (p.author !== me.id) notify(p.author, 'reaction', { postId: p.id, from: me.id, kind });
    return { data: { kind } };
  };
  H['DELETE /api/posts/:id/reactions'] = ({ me, params }) => { need(me); q('DELETE FROM reactions WHERE post_id=? AND user_id=?').run(+params.id, me.id); return { data: { kind: null } }; };
  H['POST /api/posts/:id/bookmark'] = ({ me, params }) => { need(me); getPost(+params.id, me); q('INSERT OR IGNORE INTO bookmarks VALUES(?,?)').run(+params.id, me.id); return { data: { bookmarked: true } }; };
  H['DELETE /api/posts/:id/bookmark'] = ({ me, params }) => { need(me); q('DELETE FROM bookmarks WHERE post_id=? AND user_id=?').run(+params.id, me.id); return { data: { bookmarked: false } }; };

  // ---- groups
  H['POST /api/groups'] = ({ me, body, ip }) => {
    need(me); limit(me, ip);
    const r = q('INSERT INTO groups_(name, description, owner, visibility, created_at) VALUES(?,?,?,?,?)')
      .run(str(body.name, 80, 'name', 3), str(body.description ?? '', 2000, 'description'), me.id, body.visibility === 'private' ? 'private' : 'public', now());
    q("INSERT INTO group_members VALUES(?,?,'owner')").run(r.lastInsertRowid, me.id);
    return { status: 201, data: { id: Number(r.lastInsertRowid) } };
  };
  const serializeGroup = (g, me) => ({
    id: g.id, name: g.name, description: g.description, visibility: g.visibility, owner: { id: g.owner, displayName: user(g.owner)?.display_name },
    members: q('SELECT COUNT(*) c FROM group_members WHERE group_id=?').get(g.id).c,
    myRole: me ? q('SELECT role FROM group_members WHERE group_id=? AND user_id=?').get(g.id, me.id)?.role ?? null : null,
  });
  H['GET /api/groups'] = ({ me, query }) => {
    const { limit: lim } = page(query); const offset = Math.max(0, +query.offset || 0);
    const rows = q("SELECT * FROM groups_ WHERE visibility='public' OR id IN (SELECT group_id FROM group_members WHERE user_id=?) ORDER BY id DESC LIMIT ? OFFSET ?").all(me?.id ?? -1, lim, offset);
    return { data: { items: rows.map((g) => serializeGroup(g, me)), nextOffset: rows.length === lim ? offset + lim : null } };
  };
  H['GET /api/groups/:id'] = ({ me, params }) => {
    const g = q('SELECT * FROM groups_ WHERE id=?').get(+params.id); if (!g) throw new HttpError(404, 'not_found');
    const member = me && q('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?').get(g.id, me.id);
    if (g.visibility === 'private' && !member) return { data: { id: g.id, name: g.name, visibility: 'private', restricted: true } };
    const members = q('SELECT user_id, role FROM group_members WHERE group_id=? LIMIT 100').all(g.id).map((m) => ({ id: m.user_id, role: m.role, displayName: user(m.user_id).display_name }));
    return { data: { ...serializeGroup(g, me), memberList: members } };
  };
  H['POST /api/groups/:id/join'] = ({ me, params }) => {
    need(me); const g = q('SELECT * FROM groups_ WHERE id=?').get(+params.id); if (!g) throw new HttpError(404, 'not_found');
    if (g.visibility === 'private') {
      const inv = q("SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND role='invited'").get(g.id, me.id);
      if (!inv) throw new HttpError(403, 'invite_required');
      q("UPDATE group_members SET role='member' WHERE group_id=? AND user_id=?").run(g.id, me.id);
    } else q("INSERT OR IGNORE INTO group_members VALUES(?,?,'member')").run(g.id, me.id);
    return { data: { joined: true } };
  };
  H['POST /api/groups/:id/leave'] = ({ me, params }) => {
    need(me); const g = q('SELECT * FROM groups_ WHERE id=?').get(+params.id); if (!g) throw new HttpError(404, 'not_found');
    if (g.owner === me.id) throw new HttpError(400, 'owner_cannot_leave');
    q('DELETE FROM group_members WHERE group_id=? AND user_id=?').run(g.id, me.id); return { data: { left: true } };
  };
  H['POST /api/groups/:id/invite'] = ({ me, params, body }) => {
    need(me); const gid = +params.id; requireGroupRole(gid, me.id, ['owner', 'moderator']);
    const target = user(+body.userId); if (!target) throw new HttpError(404, 'not_found');
    if (blockedEither(me.id, target.id)) throw new HttpError(403, 'blocked');
    q("INSERT OR IGNORE INTO group_members VALUES(?,?,'invited')").run(gid, target.id);
    notify(target.id, 'group_invite', { groupId: gid, from: me.id }); return { data: { invited: true } };
  };
  H['POST /api/groups/:id/role'] = ({ me, params, body }) => {
    need(me); const gid = +params.id; requireGroupRole(gid, me.id, ['owner']);
    if (!['member', 'moderator'].includes(body.role)) throw new HttpError(400, 'invalid_role');
    q('UPDATE group_members SET role=? WHERE group_id=? AND user_id=? AND role!=?').run(body.role, gid, +body.userId, 'owner'); return { data: { ok: true } };
  };
  H['POST /api/groups/:id/remove'] = ({ me, params, body }) => {
    need(me); const gid = +params.id; requireGroupRole(gid, me.id, ['owner', 'moderator']);
    q("DELETE FROM group_members WHERE group_id=? AND user_id=? AND role NOT IN ('owner')").run(gid, +body.userId); return { data: { ok: true } };
  };
  function requireGroupRole(gid, uid, roles) {
    const m = q('SELECT role FROM group_members WHERE group_id=? AND user_id=?').get(gid, uid);
    if (!m || !roles.includes(m.role)) throw new HttpError(403, 'forbidden');
  }

  // ---- events
  H['POST /api/events'] = ({ me, body, ip }) => {
    need(me); limit(me, ip);
    if (isMinor(me)) throw new HttpError(403, 'minors_cannot_organize');
    const s = body.start ?? {}, d = body.destination ?? null;
    if (!validLonLat(s.lon, s.lat)) throw new HttpError(400, 'invalid_start');
    if (d && !validLonLat(d.lon, d.lat)) throw new HttpError(400, 'invalid_destination');
    const startsAt = new Date(body.startsAt);
    if (isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 3600_000) throw new HttpError(400, 'invalid_start_time');
    const maxP = Math.max(2, Math.min(200, +body.maxParticipants || 10));
    const route = body.route ? JSON.stringify(trimRoute(body.route, false)) : null; // route of a public event is meant to be shared
    let groupId = null;
    if (body.groupId != null) { groupId = +body.groupId; requireGroupRole(groupId, me.id, ['owner', 'moderator', 'member']); }
    const r = q(`INSERT INTO events(organizer, group_id, title, description, start_name, start_lon, start_lat, dest_name, dest_lon, dest_lat, route, starts_at, duration_h,
      difficulty, max_participants, equipment, visibility, adults_only, country, distance_km, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      me.id, groupId, str(body.title, 120, 'title', 3), str(body.description ?? '', 4000, 'description'), str(s.name ?? '', 200, 'start_name'), s.lon, s.lat,
      d ? str(d.name ?? '', 200, 'dest_name') : null, d?.lon ?? null, d?.lat ?? null, route, startsAt.toISOString(),
      isNum(body.durationH) ? body.durationH : null, ['easy', 'moderate', 'hard', 'alpine'].includes(body.difficulty) ? body.difficulty : null,
      maxP, str(body.equipment ?? '', 2000, 'equipment'), body.visibility === 'private' ? 'private' : 'public', body.adultsOnly === false ? 0 : 1,
      str(body.country ?? '', 60, 'country'), isNum(body.distanceKm) ? body.distanceKm : null, now());
    q("INSERT INTO participants VALUES(?,?,'accepted')").run(r.lastInsertRowid, me.id);
    return { status: 201, data: serializeEvent(q('SELECT * FROM events WHERE id=?').get(r.lastInsertRowid), me.id) };
  };
  H['GET /api/events'] = ({ me, query }) => {
    const { limit: lim } = page(query); const offset = Math.max(0, +query.offset || 0);
    const where = ["status='active'", 'starts_at >= ?']; const args = [query.from ? new Date(query.from).toISOString() : new Date(Date.now() - 86400_000).toISOString()];
    if (query.to) { where.push('starts_at <= ?'); args.push(new Date(query.to).toISOString()); }
    if (query.country) { where.push('country = ?'); args.push(String(query.country)); }
    if (query.difficulty) { where.push('difficulty = ?'); args.push(String(query.difficulty)); }
    if (query.maxKm) { where.push('distance_km <= ?'); args.push(+query.maxKm); }
    if (query.bbox) {
      const [w, s, e, n] = String(query.bbox).split(',').map(Number);
      if ([w, s, e, n].every(isNum)) { where.push('start_lon BETWEEN ? AND ? AND start_lat BETWEEN ? AND ?'); args.push(w, e, s, n); }
    }
    const rows = q(`SELECT * FROM events WHERE ${where.join(' AND ')} ORDER BY starts_at LIMIT ? OFFSET ?`).all(...args, lim * 2, offset);
    const items = rows.filter((ev) => eventVisibleTo(ev, me?.id)).slice(0, lim).map((ev) => serializeEvent(ev, me?.id));
    return { data: { items, nextOffset: rows.length === lim * 2 ? offset + lim * 2 : null } };
  };
  const getEvent = (id, me) => { const ev = q('SELECT * FROM events WHERE id=?').get(id); if (!ev || !eventVisibleTo(ev, me?.id)) throw new HttpError(404, 'not_found'); return ev; };
  H['GET /api/events/:id'] = ({ me, params }) => ({ data: serializeEvent(getEvent(+params.id, me), me?.id) });
  H['PATCH /api/events/:id'] = ({ me, params, body }) => {
    need(me); const ev = getEvent(+params.id, me); if (ev.organizer !== me.id) throw new HttpError(403, 'forbidden');
    if (body.startsAt) { const d = new Date(body.startsAt); if (isNaN(d)) throw new HttpError(400, 'invalid_start_time'); q('UPDATE events SET starts_at=? WHERE id=?').run(d.toISOString(), ev.id); }
    if (typeof body.description === 'string') q('UPDATE events SET description=? WHERE id=?').run(str(body.description, 4000, 'description'), ev.id);
    if (typeof body.update === 'string') q('INSERT INTO event_updates(event_id, text, created_at) VALUES(?,?,?)').run(ev.id, str(body.update, 1000, 'update', 1), now());
    for (const p of q("SELECT user_id FROM participants WHERE event_id=? AND status='accepted' AND user_id!=?").all(ev.id, me.id)) notify(p.user_id, 'event_changed', { eventId: ev.id, title: ev.title });
    return { data: serializeEvent(q('SELECT * FROM events WHERE id=?').get(ev.id), me.id) };
  };
  H['POST /api/events/:id/cancel'] = ({ me, params }) => {
    need(me); const ev = getEvent(+params.id, me); if (ev.organizer !== me.id) throw new HttpError(403, 'forbidden');
    q("UPDATE events SET status='cancelled' WHERE id=?").run(ev.id);
    q('DELETE FROM live_shares WHERE event_id=?').run(ev.id);
    for (const p of q("SELECT user_id FROM participants WHERE event_id=? AND user_id!=?").all(ev.id, me.id)) notify(p.user_id, 'event_changed', { eventId: ev.id, title: ev.title, cancelled: true });
    return { data: { cancelled: true } };
  };
  H['POST /api/events/:id/join'] = ({ me, params }) => {
    need(me); const ev = getEvent(+params.id, me);
    if (ev.status !== 'active') throw new HttpError(400, 'event_not_active');
    if (ev.adults_only && isMinor(me)) throw new HttpError(403, 'adults_only');
    if (blockedEither(me.id, ev.organizer)) throw new HttpError(403, 'blocked');
    const existing = q('SELECT status FROM participants WHERE event_id=? AND user_id=?').get(ev.id, me.id);
    if (existing && existing.status !== 'left' && existing.status !== 'declined') throw new HttpError(409, 'already_' + existing.status);
    q("INSERT INTO participants VALUES(?,?,'requested') ON CONFLICT(event_id,user_id) DO UPDATE SET status='requested'").run(ev.id, me.id);
    notify(ev.organizer, 'join_request', { eventId: ev.id, from: me.id, name: me.display_name });
    return { data: { status: 'requested' } };
  };
  H['POST /api/events/:id/respond'] = ({ me, params, body }) => {
    need(me); const ev = getEvent(+params.id, me); if (ev.organizer !== me.id) throw new HttpError(403, 'forbidden');
    const uid = +body.userId; const accept = body.accept === true;
    const p = q("SELECT 1 FROM participants WHERE event_id=? AND user_id=? AND status='requested'").get(ev.id, uid);
    if (!p) throw new HttpError(404, 'no_request');
    if (accept && q("SELECT COUNT(*) c FROM participants WHERE event_id=? AND status='accepted'").get(ev.id).c >= ev.max_participants) throw new HttpError(409, 'event_full');
    q('UPDATE participants SET status=? WHERE event_id=? AND user_id=?').run(accept ? 'accepted' : 'declined', ev.id, uid);
    if (accept) notify(uid, 'join_accepted', { eventId: ev.id, title: ev.title });
    return { data: { status: accept ? 'accepted' : 'declined' } };
  };
  H['POST /api/events/:id/leave'] = ({ me, params }) => {
    need(me); const ev = getEvent(+params.id, me); if (ev.organizer === me.id) throw new HttpError(400, 'organizer_cannot_leave');
    q("UPDATE participants SET status='left' WHERE event_id=? AND user_id=?").run(ev.id, me.id);
    q('DELETE FROM live_shares WHERE event_id=? AND user_id=?').run(ev.id, me.id);
    return { data: { status: 'left' } };
  };
  H['GET /api/events/:id/participants'] = ({ me, params, query }) => {
    need(me); const ev = getEvent(+params.id, me);
    const isOrg = ev.organizer === me.id;
    const mine = q("SELECT 1 FROM participants WHERE event_id=? AND user_id=? AND status='accepted'").get(ev.id, me.id);
    if (!isOrg && !mine) throw new HttpError(403, 'participants_only');
    const { limit: lim } = page(query); const offset = Math.max(0, +query.offset || 0);
    const rows = q(`SELECT user_id, status FROM participants WHERE event_id=? ${isOrg ? '' : "AND status='accepted'"} LIMIT ? OFFSET ?`).all(ev.id, lim, offset);
    return { data: { items: rows.map((r) => ({ id: r.user_id, displayName: user(r.user_id).display_name, status: r.status })), nextOffset: rows.length === lim ? offset + lim : null } };
  };

  // ---- live location sharing (consent-based, organizer-only view, auto-expiry)
  H['POST /api/events/:id/live'] = ({ me, params, body }) => {
    need(me); const ev = getEvent(+params.id, me);
    if (ev.status !== 'active') throw new HttpError(400, 'event_not_active');
    if (body.consent !== true) throw new HttpError(400, 'consent_required');
    const accepted = q("SELECT 1 FROM participants WHERE event_id=? AND user_id=? AND status='accepted'").get(ev.id, me.id);
    if (!accepted) throw new HttpError(403, 'participants_only');
    const end = eventEnd(ev);
    if (Date.now() > end.getTime()) throw new HttpError(400, 'event_ended');
    if (!validLonLat(body.lon, body.lat)) throw new HttpError(400, 'invalid_coordinates');
    q('INSERT INTO live_shares VALUES(?,?,?,?,?,?,?) ON CONFLICT(event_id,user_id) DO UPDATE SET lon=excluded.lon, lat=excluded.lat, acc=excluded.acc, updated_at=excluded.updated_at')
      .run(ev.id, me.id, body.lon, body.lat, isNum(body.acc) ? body.acc : null, now(), end.toISOString());
    return { data: { sharing: true, expiresAt: end.toISOString() } };
  };
  H['DELETE /api/events/:id/live'] = ({ me, params }) => { need(me); q('DELETE FROM live_shares WHERE event_id=? AND user_id=?').run(+params.id, me.id); return { data: { sharing: false } }; };
  H['GET /api/events/:id/live'] = ({ me, params }) => {
    need(me); const ev = getEvent(+params.id, me);
    q('DELETE FROM live_shares WHERE expires_at < ?').run(now());
    if (ev.organizer !== me.id) {
      // Participants only see their own sharing status, never others' coordinates.
      const own = q('SELECT updated_at, expires_at FROM live_shares WHERE event_id=? AND user_id=?').get(ev.id, me.id);
      return { data: { mine: own ? { updatedAt: own.updated_at, expiresAt: own.expires_at } : null } };
    }
    const rows = q('SELECT * FROM live_shares WHERE event_id=?').all(ev.id);
    return { data: { participants: rows.map((r) => ({ id: r.user_id, displayName: user(r.user_id).display_name, lon: r.lon, lat: r.lat, acc: r.acc, updatedAt: r.updated_at })) } };
  };

  // ---- community map (public only, no private user locations)
  H['GET /api/community/map'] = ({ me, query }) => {
    const events = H['GET /api/events']({ me, query: { ...query, limit: 50 } }).data.items.filter((e) => e.visibility === 'public')
      .map((e) => ({ type: 'event', id: e.id, title: e.title, lon: e.start.lon, lat: e.start.lat, startsAt: e.startsAt, difficulty: e.difficulty, distanceKm: e.distanceKm }));
    const routes = q("SELECT * FROM posts WHERE visibility='public' AND route IS NOT NULL AND group_id IS NULL ORDER BY id DESC LIMIT 100").all()
      .filter((p) => canSeePost(p, me?.id)).map((p) => { const r = JSON.parse(p.route); const mid = r[Math.floor(r.length / 2)]; return { type: 'route', id: p.id, title: p.text.slice(0, 80), lon: mid[0], lat: mid[1], stats: p.stats ? JSON.parse(p.stats) : null }; });
    return { data: { items: [...events, ...routes] } };
  };

  // ---- moderation
  H['POST /api/reports'] = ({ me, body, ip }) => {
    need(me); limit(me, ip);
    if (!['user', 'post', 'comment', 'event', 'group'].includes(body.targetType)) throw new HttpError(400, 'invalid_target');
    q('INSERT INTO reports(reporter, target_type, target_id, reason, created_at) VALUES(?,?,?,?,?)').run(me.id, body.targetType, +body.targetId, str(body.reason, 1000, 'reason', 3), now());
    return { status: 201, data: { reported: true } };
  };
  H['GET /api/admin/reports'] = ({ me }) => { need(me); if (me.role !== 'admin') throw new HttpError(403, 'forbidden'); return { data: { items: q("SELECT * FROM reports WHERE status='open' ORDER BY id DESC LIMIT 100").all() } }; };

  // ---- notifications
  H['GET /api/notifications'] = ({ me, query }) => {
    need(me); const { limit: lim, before } = page(query);
    const rows = q('SELECT * FROM notifications WHERE user_id=? AND id<? ORDER BY id DESC LIMIT ?').all(me.id, before, lim);
    return { data: { items: rows.map((n) => ({ id: n.id, kind: n.kind, data: JSON.parse(n.data), read: !!n.read, createdAt: n.created_at })), unread: q('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0').get(me.id).c } };
  };
  H['POST /api/notifications/read'] = ({ me }) => { need(me); q('UPDATE notifications SET read=1 WHERE user_id=?').run(me.id); return { data: { ok: true } }; };
  H['GET /api/notifications/prefs'] = ({ me }) => { need(me); return { data: JSON.parse(q('SELECT prefs FROM notif_prefs WHERE user_id=?').get(me.id)?.prefs ?? '{}') }; };
  H['PUT /api/notifications/prefs'] = ({ me, body }) => {
    need(me); const clean = {}; for (const k of NOTIF_KINDS) if (typeof body[k] === 'boolean') clean[k] = body[k];
    q('INSERT INTO notif_prefs VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET prefs=excluded.prefs').run(me.id, JSON.stringify(clean)); return { data: clean };
  };

  /** Called periodically: notify accepted participants of events starting within 24 h (once). */
  function sweepUpcoming() {
    q('DELETE FROM live_shares WHERE expires_at < ?').run(now());
    const soon = q("SELECT * FROM events WHERE status='active' AND starts_at BETWEEN ? AND ?").all(now(), new Date(Date.now() + 86400_000).toISOString());
    for (const ev of soon) for (const p of q("SELECT user_id FROM participants WHERE event_id=? AND status='accepted'").all(ev.id)) {
      const already = q("SELECT 1 FROM notifications WHERE user_id=? AND kind='event_upcoming' AND data LIKE ?").get(p.user_id, `%"eventId":${ev.id},%`);
      if (!already) notify(p.user_id, 'event_upcoming', { eventId: ev.id, title: ev.title, startsAt: ev.starts_at });
    }
  }

  function need(me) { if (!me) throw new HttpError(401, 'auth_required'); }
  function limit(me, ip) { if (!writeLimiter.take(`${me.id}|${ip}`)) throw new HttpError(429, 'rate_limited'); }

  function sessionUser(token) {
    if (!token) return null;
    const s = q('SELECT * FROM sessions WHERE token_hash=?').get(hashToken(token));
    if (!s || s.expires < Date.now()) return null;
    return user(s.user_id) ?? null;
  }

  function readMedia(id, viewerId) {
    if (!/^[a-f0-9]{32}\.(jpeg|png|webp|mp4|webm)$/.test(id)) return null;
    const f = join(DATA_DIR, 'media', id);
    if (!existsSync(f) || !mediaAllowed(id, viewerId)) return null;
    const ext = id.split('.')[1];
    return { buf: readFileSync(f), type: ext === 'mp4' || ext === 'webm' ? `video/${ext}` : `image/${ext}` };
  }

  const routes = Object.entries(H).map(([k, fn]) => {
    const [method, path] = k.split(' ');
    const keys = []; const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, n) => { keys.push(n); return '([^/]+)'; }) + '$');
    return { method, re, keys, fn };
  });
  function match(method, pathname) {
    for (const r of routes) { if (r.method !== method) continue; const m = pathname.match(r.re); if (m) return { fn: r.fn, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) }; }
    return null;
  }

  return { match, sessionUser, readMedia, sweepUpcoming, db };
}
