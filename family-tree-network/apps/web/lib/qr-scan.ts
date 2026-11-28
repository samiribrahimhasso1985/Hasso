/**
 * Reads an EZIDINET connection token from scanned QR text.
 * Accepts a link …/c/<token> from any host or a bare token, but only the token is used: the app always opens
 * /c/<token> on its own address, never a link from a code (protection against look-alike sites).
 */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function tokenFromQr(text: string): string | null {
  const raw = text.trim();
  if (TOKEN.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const m = u.pathname.match(/^\/c\/([A-Za-z0-9_-]{43})\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
