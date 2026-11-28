/**
 * ÊZÎDÎ Calendar display rule (owner decision): a holy day's card appears the day BEFORE it and ON it (every day of a
 * multi-day holy day), never earlier, and disappears after its last day. "Today" is the viewer's local date in their
 * time zone. The dates themselves are never computed here — they are entered and verified by a calendar editor, so the
 * traditional rules of the holy days are not changed by software.
 */

/** YYYY-MM-DD of an instant in a time zone (UTC if the zone is unknown). */
export function localDate(at: Date, timeZone: string): string {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ymdOf = (d: Date) => d.toISOString().slice(0, 10);

export type HolidayPhase = 'TOMORROW' | 'TODAY';

/** Which phase a holy day is in for `today`, or null when its card must not be shown. */
export function holidayPhase(startYmd: string, endYmd: string, todayYmd: string): HolidayPhase | null {
  if (todayYmd >= startYmd && todayYmd <= endYmd) return 'TODAY';
  if (addDays(todayYmd, 1) === startYmd) return 'TOMORROW';
  return null;
}
