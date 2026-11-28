import type { Locale } from '../../lib/i18n';
import type { Names } from '../../lib/api';

const loc = (l: Locale) => (l === 'ku' ? 'ku' : l);

/** Date and time of an event in its own time zone, e.g. "Sat 12 Apr · 18:00". */
export function whenText(startsAt: string, endsAt: string, timeZone: string, l: Locale) {
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(loc(l), { timeZone, ...o }).format(new Date(d));
    } catch {
      return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...o }).format(new Date(d));
    }
  };
  const day = fmt(startsAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const t1 = fmt(startsAt, { hour: '2-digit', minute: '2-digit' });
  const sameDay = fmt(startsAt, { dateStyle: 'short' }) === fmt(endsAt, { dateStyle: 'short' });
  const t2 = sameDay ? fmt(endsAt, { hour: '2-digit', minute: '2-digit' }) : fmt(endsAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t1}–${t2}`;
}

export function timeOnly(iso: string, timeZone: string, l: Locale) {
  try {
    return new Intl.DateTimeFormat(loc(l), { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** A calendar date (YYYY-MM-DD, no time zone shift). */
export function dateText(ymd: string, l: Locale, withWeekday = true) {
  return new Intl.DateTimeFormat(loc(l), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', ...(withWeekday ? { weekday: 'long' } : {}) }).format(new Date(`${ymd}T00:00:00Z`));
}

export function placeText(city: string | null, country: string | null, l: Locale) {
  let c = country ?? '';
  try {
    if (country) c = new Intl.DisplayNames([loc(l)], { type: 'region' }).of(country) ?? country;
  } catch {
    /* keep the code */
  }
  return [city, c].filter(Boolean).join(', ');
}

export const nameIn = (n: Names, l: Locale) => n[l] ?? n.en;

/** Share a public link: the system share sheet where available, else copy the link. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, url });
      return 'shared';
    }
  } catch {
    /* cancelled or unavailable */
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
