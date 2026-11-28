/** Password rules shared by registration, reset and change. Returns an error code or null. */
const COMMON = new Set([
  'password123', 'password1234', '1234567890', '12345678910', 'qwertyuiop', 'qwerty12345', 'iloveyou123',
  'abcdefghij', 'passwort123', 'letmein1234', 'welcome1234', 'admin12345', '1111111111', '0123456789',
  'ezidinet123', 'ezidinet2026', 'password2026', 'football123', 'sunshine123', 'princess123',
]);

export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < 10) return 'PASSWORD_TOO_SHORT';
  if (password.length > 200) return 'PASSWORD_TOO_LONG';
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return 'PASSWORD_TOO_COMMON';
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'PASSWORD_CONTAINS_EMAIL';
  return null;
}
