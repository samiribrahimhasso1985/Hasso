// Small shared helpers for the SAMIR WANDERUNG server (no framework).
export const UA = process.env.UPSTREAM_USER_AGENT || 'SamirWanderung/0.1 (+https://github.com/samiribrahimhasso1985/Hasso)';

export class HttpError extends Error {
  constructor(status, code, detail) { super(code); this.status = status; this.code = code; this.detail = detail; }
}

export function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'content-type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(body);
}

export async function readJson(req, limit = 2_000_000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new HttpError(413, 'payload_too_large'); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'invalid_json'); }
}

/** Simple LRU-ish cache with TTL. */
export class Cache {
  constructor(max = 500, ttlMs = 3600_000) { this.max = max; this.ttl = ttlMs; this.map = new Map(); }
  get(k) { const e = this.map.get(k); if (!e) return undefined; if (Date.now() > e.exp) { this.map.delete(k); return undefined; } this.map.delete(k); this.map.set(k, e); return e.v; }
  set(k, v) { this.map.set(k, { v, exp: Date.now() + this.ttl }); if (this.map.size > this.max) this.map.delete(this.map.keys().next().value); }
}

/** Token bucket per key (e.g. client IP). */
export class RateLimiter {
  constructor(capacity, refillPerSec) { this.cap = capacity; this.rate = refillPerSec; this.b = new Map(); }
  take(key, n = 1) {
    const now = Date.now();
    const s = this.b.get(key) ?? { tokens: this.cap, t: now };
    s.tokens = Math.min(this.cap, s.tokens + ((now - s.t) / 1000) * this.rate); s.t = now;
    if (s.tokens < n) { this.b.set(key, s); return false; }
    s.tokens -= n; this.b.set(key, s); return true;
  }
}

/** Serialises calls with a minimum interval (Nominatim: max 1 req/s). */
export function serialQueue(minIntervalMs) {
  let last = 0; let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(async () => {
      const wait = last + minIntervalMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      last = Date.now();
      return fn();
    });
    chain = run.catch(() => {});
    return run;
  };
}

export async function upstream(url, opts = {}, timeoutMs = 25_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal, headers: { 'user-agent': UA, accept: 'application/json', ...(opts.headers || {}) } });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    if (!r.ok) throw new HttpError(r.status === 429 ? 429 : 502, r.status === 429 ? 'provider_rate_limited' : 'provider_error', { status: r.status, body: typeof data === 'string' ? data.slice(0, 300) : data });
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(503, 'provider_unavailable', { message: String(e.message || e) });
  } finally { clearTimeout(timer); }
}

export function clientIp(req) {
  return (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
}

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const validLonLat = (lon, lat) => isNum(lon) && isNum(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
