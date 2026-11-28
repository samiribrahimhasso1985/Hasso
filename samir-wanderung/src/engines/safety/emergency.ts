/**
 * Emergency numbers. Only entries we can attribute to an official source are listed.
 * EU/EEA: 112 is the single European emergency number (Directive (EU) 2018/1972, art. 109;
 * see https://digital-strategy.ec.europa.eu/en/policies/112). Others cite the national authority.
 * Unknown countries return null — the UI then says so instead of guessing.
 */
export interface EmergencyInfo { primary: string; extra?: { label: string; number: string }[]; source: string }

const EU112 = { primary: '112', source: 'European Commission — 112, the single European emergency number' };
const EU = ['at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se', 'is', 'li', 'no'];

const TABLE: Record<string, EmergencyInfo> = {
  ...Object.fromEntries(EU.map((c) => [c, EU112])),
  at: { ...EU112, extra: [{ label: 'Bergrettung (mountain rescue)', number: '140' }] },
  ch: { primary: '112', extra: [{ label: 'Rega air rescue', number: '1414' }, { label: 'Ambulance', number: '144' }], source: 'Swiss Confederation (ch.ch) / Rega' },
  gb: { primary: '999', extra: [{ label: 'Also works', number: '112' }], source: 'UK Government (gov.uk)' },
  us: { primary: '911', source: 'U.S. FCC — 911' },
  ca: { primary: '911', source: 'Government of Canada' },
  au: { primary: '000', extra: [{ label: 'From mobile', number: '112' }], source: 'Triple Zero (triplezero.gov.au)' },
  nz: { primary: '111', source: 'New Zealand Police' },
  jp: { primary: '119', extra: [{ label: 'Police', number: '110' }], source: 'Japan Fire and Disaster Management Agency' },
};

export function emergencyFor(countryCode: string | null | undefined): EmergencyInfo | null {
  if (!countryCode) return null;
  return TABLE[countryCode.toLowerCase()] ?? null;
}

export function emergencySmsBody(opts: { lon: number; lat: number; acc: number | null; alt: number | null; time: number; note?: string }): string {
  const lat = opts.lat.toFixed(5), lon = opts.lon.toFixed(5);
  return [
    'EMERGENCY / NOTFALL / طوارئ',
    `Position: ${lat}, ${lon}${opts.acc != null ? ` (±${Math.round(opts.acc)} m)` : ''}`,
    opts.alt != null ? `Altitude: ${Math.round(opts.alt)} m` : '',
    `Time: ${new Date(opts.time).toISOString()}`,
    `Map: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
    opts.note ?? '',
  ].filter(Boolean).join('\n');
}

export const DEFAULT_CHECKLIST = [
  'route', 'weather', 'offline', 'battery', 'water', 'clothing', 'footwear', 'emergency',
] as const;
