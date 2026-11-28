import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORY, PALETTE, TOKENS, contrastRatio } from '../lib/tokens';

const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8').toLowerCase();
const cssVar = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))?.[1];

describe('design tokens (Modern Luxury / Editorial Minimalism)', () => {
  it('CSS palette variables equal the approved palette exactly', () => {
    const map: Record<string, keyof typeof PALETTE> = {
      'warm-sand': 'warmSand', 'pale-beige': 'paleBeige', 'soft-cream': 'softCream', 'deep-graphite': 'deepGraphite',
      'stone-gray': 'stoneGray', 'warm-gray': 'warmGray', 'muted-terracotta': 'mutedTerracotta',
      'dusty-olive': 'dustyOlive', 'slate-blue-gray': 'slateBlueGray', 'soft-cocoa': 'softCocoa', 'soft-gold': 'softGold',
    };
    for (const [v, k] of Object.entries(map)) expect(cssVar(v), v).toBe(PALETTE[k].toLowerCase());
    expect(cssVar('text-2')).toBe(TOKENS.textSecondary.toLowerCase());
    expect(cssVar('accent-ink')).toBe(TOKENS.accentInk.toLowerCase());
  });

  it('no neon / legacy navy-gold colours remain in the stylesheet', () => {
    for (const legacy of ['#071426', '#e8b94f', '#ffd978', '#25a9ff', '#ff4d91', '#a56bff', '#43d99a']) expect(css).not.toContain(legacy);
  });

  it('text tokens meet WCAG AA (4.5:1) on page and card backgrounds', () => {
    for (const fg of [TOKENS.text, TOKENS.textSecondary, TOKENS.accentInk, TOKENS.success, TOKENS.danger]) {
      for (const bg of [TOKENS.bg, TOKENS.surface]) expect(contrastRatio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(TOKENS.surface, TOKENS.text)).toBeGreaterThanOrEqual(4.5); // primary button text
  });

  it('relationship line colours reach 3:1 non-text contrast on the graph canvas', () => {
    for (const [cat, c] of Object.entries(CATEGORY)) {
      expect(contrastRatio(c, PALETTE.softCream), cat).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(c, PALETTE.warmSand), cat).toBeGreaterThanOrEqual(3);
    }
  });

  it('every category has a distinct colour', () => {
    expect(new Set(Object.values(CATEGORY)).size).toBe(Object.keys(CATEGORY).length);
  });
});
