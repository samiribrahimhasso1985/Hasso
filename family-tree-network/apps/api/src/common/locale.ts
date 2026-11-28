import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Locale } from '@ftn/relationship-engine';

const SUPPORTED: Locale[] = ['en', 'de', 'ar', 'ku'];

/** Locale from ?locale=, then Accept-Language, then English. */
export const ReqLocale = createParamDecorator((_: unknown, ctx: ExecutionContext): Locale => {
  const req = ctx.switchToHttp().getRequest();
  const q = String(req.query?.locale ?? '').toLowerCase();
  if (SUPPORTED.includes(q as Locale)) return q as Locale;
  const header = String(req.headers['accept-language'] ?? '').toLowerCase();
  for (const part of header.split(',')) {
    const tag = part.trim().slice(0, 2) as Locale;
    if (SUPPORTED.includes(tag)) return tag;
  }
  return 'en';
});

export const NO_CONNECTION: Record<Locale, string> = {
  en: 'No verified connection found',
  de: 'Keine bestätigte Verbindung gefunden',
  ar: 'لم يتم العثور على صلة موثّقة',
  ku: 'Têkiliyeke piştrastkirî nehat dîtin',
};
