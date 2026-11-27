/**
 * FAMILY NETWORK design tokens — Modern Luxury / Editorial Minimalism (CLAUDE.md §31, docs/design/COLOR_TOKENS.md).
 * The CSS custom properties in app/globals.css mirror these values; a unit test keeps both in sync
 * and checks WCAG contrast.
 */
import { CATEGORY_COLORS } from '@ftn/relationship-engine';

/** Approved palette (owner-specified, do not change without approval). */
export const PALETTE = {
  warmSand: '#F3F0E9',
  paleBeige: '#E9E5DC',
  softCream: '#FAF9F5',
  deepGraphite: '#30302D',
  stoneGray: '#858078',
  warmGray: '#DDD8CE',
  mutedTerracotta: '#B58F7B',
  dustyOlive: '#989985',
  slateBlueGray: '#87939A',
  softCocoa: '#A18D80',
  /** EZIDINET accent (EZ-11): highlights and badges only — 2.09:1 on Warm Sand, never text or thin lines. */
  softGold: '#C9A34F',
} as const;

/** Semantic tokens. "ink" variants keep the palette hue but reach 4.5:1 for small text. */
export const TOKENS = {
  bg: PALETTE.warmSand,
  surface: PALETTE.softCream,
  surfaceAlt: PALETTE.paleBeige,
  border: PALETTE.warmGray,
  text: PALETTE.deepGraphite,
  textSecondary: '#716C65', // Stone Gray, ink variant (4.57:1 on Warm Sand)
  textDecorative: PALETTE.stoneGray, // large text / icons only (3.44:1)
  accent: PALETTE.mutedTerracotta,
  accentInk: '#826658', // terracotta for small text/links (4.62:1)
  success: '#6D6E5F', // Dusty Olive ink
  warning: '#826658',
  danger: '#9A4F43', // muted brick red, 5.9:1 — errors only
  focus: PALETTE.deepGraphite,
  /** Official verified-badge blue (controlled status indicator only, v2 §26). */
  verifiedBlue: '#2F6FB3',
} as const;

/** Relationship category line colours (single source: the relationship engine). */
export const CATEGORY = CATEGORY_COLORS;

export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
