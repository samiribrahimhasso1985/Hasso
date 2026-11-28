// SAMIR WANDERUNG server: provider proxies (keys stay here), AI, social API, static hosting.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { HttpError, RateLimiter, clientIp, readJson, send } from './lib.mjs';
import * as P from './providers.mjs';
import { chat, aiStatus } from './ai.mjs';
import { openDb, createSocial } from './social.mjs';

const PORT = +(process.env.PORT || 8787);
const DIST = join(process.cwd(), 'dist');
const PROD = process.env.NODE_ENV === 'production';
const social = createSocial(openDb());
const providerLimiter = new RateLimiter(60, 1); // per IP
const aiLimiter = new RateLimiter(10, 0.05);
setInterval(() => { try { social.sweepUpcoming(); } catch (e) { console.error('sweep failed', e.message); } }, 10 * 60_000).unref();

const num = (v) => (v === undefined ? undefined : Number(v));
const PROVIDER_ROUTES = {
  'GET /api/geocode': (q) => P.geocode({ q: q.q, limit: num(q.limit), lang: q.lang }),
  'GET /api/reverse': (q) => P.reverse({ lon: num(q.lon), lat: num(q.lat), lang: q.lang }),
  'POST /api/route': (_, b) => P.route(b),
  'POST /api/height': (_, b) => P.height(b),
  'POST /api/attributes': (_, b) => P.attributes(b),
  'GET /api/weather': (q) => P.weather({ lon: num(q.lon), lat: num(q.lat) }),
  'GET /api/trails': (q) => P.trails({ lon: num(q.lon), lat: num(q.lat), radiusKm: num(q.radiusKm) }),
  'GET /api/peaks': (q) => P.peaks({ west: num(q.west), south: num(q.south), east: num(q.east), north: num(q.north) }),
  'GET /api/atlas': (q) => P.atlas({ category: q.category, country: q.country || undefined, lang: q.lang, offset: num(q.offset), limit: num(q.limit) }),
  'GET /api/status': async () => ({ providers: await P.status(), ai: aiStatus() }),
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.xml': 'application/xml', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary' };

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY',
  'permissions-policy': 'geolocation=(self), camera=(), microphone=()',
};

function cookieToken(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)sw_session=([^;]+)/);
  return m ? m[1] : null;
}

const server = createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://local');
  const ip = clientIp(req);
  try {
    if (url.pathname.startsWith('/api/')) {
      const key = `${req.method} ${url.pathname}`;
      const query = Object.fromEntries(url.searchParams);
      // Mutating requests must be JSON — blocks simple cross-site form posts (CSRF) together with SameSite cookies.
      if (!['GET', 'HEAD'].includes(req.method) && !(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'json_required');

      if (PROVIDER_ROUTES[key]) {
        if (!providerLimiter.take(ip)) throw new HttpError(429, 'rate_limited');
        const body = req.method === 'POST' ? await readJson(req) : undefined;
        return send(res, 200, await PROVIDER_ROUTES[key](query, body));
      }
      if (key === 'POST /api/ai/chat') {
        if (!aiLimiter.take(ip)) throw new HttpError(429, 'rate_limited');
        return send(res, 200, await chat(await readJson(req, 200_000)));
      }
      const token = cookieToken(req);
      const me = social.sessionUser(token);
      if (req.method === 'GET' && url.pathname.startsWith('/api/media/')) {
        const m = social.readMedia(url.pathname.slice('/api/media/'.length), me?.id);
        if (!m) throw new HttpError(404, 'not_found');
        res.writeHead(200, { 'content-type': m.type, 'cache-control': 'private, max-age=3600' });
        return res.end(m.buf);
      }
      const hit = social.match(req.method, url.pathname);
      if (!hit) throw new HttpError(404, 'not_found');
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readJson(req, 60_000_000) : {};
      const out = await hit.fn({ me, body, query, params: hit.params, ip, token });
      const headers = {};
      if (out.cookie !== undefined) {
        headers['set-cookie'] = out.cookie
          ? `sw_session=${out.cookie}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}${PROD ? '; Secure' : ''}`
          : `sw_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${PROD ? '; Secure' : ''}`;
      }
      return send(res, out.status ?? 200, out.data, headers);
    }
    // Static production build (SPA fallback).
    if (existsSync(DIST)) {
      let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
      if (!file.startsWith(DIST)) throw new HttpError(400, 'bad_path');
      if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
      const ext = extname(file);
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
      return res.end(readFileSync(file));
    }
    throw new HttpError(404, 'not_found');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500 && !(e instanceof HttpError)) console.error('[server]', e); // no request bodies / locations logged
    send(res, status, { error: e instanceof HttpError ? e.code : 'internal_error' });
  }
});

server.listen(PORT, () => console.log(`SAMIR WANDERUNG server on http://localhost:${PORT}`));
