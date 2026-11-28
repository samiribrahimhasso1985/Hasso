import type { WorldLocale } from './places';

/** One country of the world (public/world/countries.json, built by scripts/build-world-countries.mjs). */
export interface WorldCountry {
  code: string; // ISO 3166-1 alpha-2 (or X… for areas without a code)
  name: Record<WorldLocale, string>;
  lat: number; // focus point (centre of the largest land area)
  lon: number;
  rings: number[][]; // outline rings, flat [lat, lon, …]
}

interface CountryFile {
  step: number;
  countries: WorldCountry[];
  rows: number[][];
}

export interface CountryIndex {
  countries: WorldCountry[];
  byCode: Map<string, WorldCountry>;
  /** Country at a point of the globe, or null for the sea. */
  at(lat: number, lon: number): WorldCountry | null;
}

let cache: Promise<CountryIndex> | null = null;

export function loadCountries(): Promise<CountryIndex> {
  cache ??= fetch('/world/countries.json')
    .then((r) => {
      if (!r.ok) throw new Error(`countries ${r.status}`);
      return r.json() as Promise<CountryFile>;
    })
    .then(buildIndex)
    .catch((e) => {
      cache = null; // allow a retry later
      throw e;
    });
  return cache;
}

export function buildIndex(file: CountryFile): CountryIndex {
  const cols = 360 / file.step;
  // Expand the run-length rows once into one lookup table.
  const grid = new Uint16Array(file.rows.length * cols);
  file.rows.forEach((row, r) => {
    let c = 0;
    for (let i = 0; i < row.length; i += 2) {
      grid.fill(row[i], r * cols + c, r * cols + c + row[i + 1]);
      c += row[i + 1];
    }
  });
  const byCode = new Map(file.countries.map((c) => [c.code, c]));
  return {
    countries: file.countries,
    byCode,
    at(lat, lon) {
      const r = Math.min(file.rows.length - 1, Math.max(0, Math.floor((90 - lat) / file.step)));
      const l = ((((lon + 180) % 360) + 360) % 360);
      const c = Math.min(cols - 1, Math.floor(l / file.step));
      const v = grid[r * cols + c];
      return v ? file.countries[v - 1] : null;
    },
  };
}

/** Countries sorted by their name in the given language. */
export function sortedCountries(list: WorldCountry[], lang: WorldLocale) {
  const coll = new Intl.Collator(lang === 'ku' ? 'ku' : lang);
  return [...list].sort((a, b) => coll.compare(a.name[lang], b.name[lang]));
}
