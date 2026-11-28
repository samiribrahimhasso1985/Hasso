/** Elevation statistics, hiking-time and difficulty estimates. All pure functions. */

export interface ElevationSample { d: number; h: number | null }

export interface ElevationStats {
  ascent: number;
  descent: number;
  min: number | null;
  max: number | null;
  /** Fraction of samples with known elevation. */
  coverage: number;
}

/**
 * Ascent/descent with a hysteresis threshold to suppress DEM noise
 * (a 3 m threshold is common practice for ~30 m DEM sampling).
 */
export function elevationStats(samples: ElevationSample[], threshold = 3): ElevationStats {
  const known = samples.filter((s): s is { d: number; h: number } => s.h !== null && Number.isFinite(s.h));
  if (known.length === 0) return { ascent: 0, descent: 0, min: null, max: null, coverage: 0 };
  let ascent = 0, descent = 0, ref = known[0].h, min = ref, max = ref;
  for (const s of known) {
    if (s.h < min) min = s.h;
    if (s.h > max) max = s.h;
    const diff = s.h - ref;
    if (diff >= threshold) { ascent += diff; ref = s.h; }
    else if (diff <= -threshold) { descent -= diff; ref = s.h; }
  }
  return { ascent: Math.round(ascent), descent: Math.round(descent), min: Math.round(min), max: Math.round(max), coverage: known.length / samples.length };
}

/**
 * DIN 33466 / Swiss hiking time formula (hours):
 * horizontal = km / 4, vertical = ascent/300 + descent/500,
 * total = max(h, v) + min(h, v) / 2.
 */
export function hikingTimeHours(distanceKm: number, ascentM: number, descentM: number): number {
  const h = distanceKm / 4;
  const v = ascentM / 300 + descentM / 500;
  return Math.max(h, v) + Math.min(h, v) / 2;
}

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'alpine';

/**
 * Estimated difficulty. Uses the highest OSM sac_scale on the route when known
 * (official-ish tag from mappers) and otherwise effort (ascent, length, gradient).
 * This is an ESTIMATE, not an official trail rating.
 */
export function estimateDifficulty(opts: { distanceKm: number; ascentM: number; maxSac?: number | null }): Difficulty {
  const { distanceKm, ascentM, maxSac } = opts;
  if (maxSac != null && maxSac >= 4) return 'alpine';
  const perKm = distanceKm > 0 ? ascentM / distanceKm : 0;
  let score = 0;
  if (ascentM > 400) score++;
  if (ascentM > 1000) score++;
  if (distanceKm > 15) score++;
  if (perKm > 120) score++;
  if (maxSac != null && maxSac >= 3) score = Math.max(score, 3);
  else if (maxSac != null && maxSac >= 2) score = Math.max(score, 2);
  return score >= 3 ? 'hard' : score >= 1 ? 'moderate' : 'easy';
}

/** OSM sac_scale string → numeric 1..6 (Valhalla returns the numeric index). */
export const SAC_NAMES = ['', 'hiking', 'mountain_hiking', 'demanding_mountain_hiking', 'alpine_hiking', 'demanding_alpine_hiking', 'difficult_alpine_hiking'];

export function formatDuration(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
