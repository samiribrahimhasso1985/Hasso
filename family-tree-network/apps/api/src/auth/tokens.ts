import { createHash, randomBytes } from 'node:crypto';

/** 256-bit random token for e-mail links (base64url). Only its SHA-256 hash is stored. */
export function newSecretToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
