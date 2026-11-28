import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** 256-bit random token, URL-safe. */
export function newQrToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Lookup key: SHA-256 of the token (the database never needs the token to resolve a scan). */
export function hashQrToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function key(): Buffer {
  const secret = process.env.QR_TOKEN_KEY;
  if (!secret || secret.length < 32) throw new Error('QR_TOKEN_KEY must be set (at least 32 characters)');
  if (process.env.NODE_ENV === 'production' && secret.includes('dev-only')) throw new Error('Refusing a development QR_TOKEN_KEY in production');
  return createHash('sha256').update(secret).digest();
}

/** AES-256-GCM so the owner can display the same QR again; format iv.tag.ciphertext (base64url). */
export function encryptQrToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64url')).join('.');
}

export function decryptQrToken(payload: string): string {
  const [iv, tag, ct] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
