import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, short-lived photo links. A link is only handed to people who may already see the person, and stops working
 * after 1–2 hours, so it cannot be shared publicly. Links stay stable within the hour so browsers can cache them.
 */
const HOUR = 3600;
const key = () => createHmac('sha256', process.env.JWT_SECRET ?? '').update('ezidinet-photo-links').digest();

function sign(profileId: string, version: number, exp: number) {
  return createHmac('sha256', key()).update(`${profileId}.${version}.${exp}`).digest('base64url');
}

export type PhotoVisibility = 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';

/** Profile.avatarUrl holds "photo:<version>:<visibility>" when a photo exists. */
export function parseMarker(marker: string | null | undefined): { version: number; visibility: PhotoVisibility } | null {
  const m = marker?.match(/^photo:(\d+):(PUBLIC|NETWORK|FAMILY|PRIVATE)$/);
  return m ? { version: Number(m[1]), visibility: m[2] as PhotoVisibility } : null;
}

export const marker = (version: number, visibility: PhotoVisibility) => `photo:${version}:${visibility}`;

/** Signed path relative to the API base, e.g. /photos/<id>?v=2&exp=…&sig=… */
export function photoPath(profileId: string, avatarMarker: string | null | undefined, now = Date.now()): string | null {
  const parsed = parseMarker(avatarMarker);
  if (!parsed) return null;
  const version = parsed.version;
  const exp = (Math.floor(now / 1000 / HOUR) + 2) * HOUR;
  return `/photos/${profileId}?v=${version}&exp=${exp}&sig=${sign(profileId, version, exp)}`;
}

export function verifyPhotoLink(profileId: string, v: string, exp: string, sig: string, now = Date.now()): number | null {
  const version = Number(v);
  const expiry = Number(exp);
  if (!Number.isInteger(version) || !Number.isInteger(expiry) || expiry * 1000 < now) return null;
  const want = Buffer.from(sign(profileId, version, expiry));
  const got = Buffer.from(sig ?? '');
  return want.length === got.length && timingSafeEqual(want, got) ? version : null;
}
