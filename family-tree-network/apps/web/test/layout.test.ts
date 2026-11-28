import { describe, expect, it } from 'vitest';
import { generationLayout } from '../lib/layout';

const nodes = [
  { id: 'grandpa', generation: -2 },
  { id: 'dad', generation: -1 },
  { id: 'mum', generation: -1 },
  { id: 'me', generation: 0 },
  { id: 'wife', generation: 0 },
  { id: 'sister', generation: 0 },
  { id: 'kid', generation: 1 },
  { id: 'friend', generation: null },
  { id: 'colleague', generation: null },
];
const edges = [
  { source: 'grandpa', target: 'dad', category: 'FAMILY' },
  { source: 'dad', target: 'me', category: 'FAMILY' },
  { source: 'mum', target: 'me', category: 'FAMILY' },
  { source: 'dad', target: 'sister', category: 'FAMILY' },
  { source: 'dad', target: 'mum', category: 'UNION' },
  { source: 'me', target: 'wife', category: 'UNION' },
  { source: 'me', target: 'kid', category: 'FAMILY' },
  { source: 'wife', target: 'kid', category: 'FAMILY' },
  { source: 'me', target: 'friend', category: 'FRIENDSHIP' },
  { source: 'me', target: 'colleague', category: 'PROFESSIONAL' },
];

describe('generationLayout', () => {
  const pos = generationLayout(nodes, edges, 'me', false);

  it('places older generations above younger ones', () => {
    expect(pos.get('grandpa')!.y).toBeLessThan(pos.get('dad')!.y);
    expect(pos.get('dad')!.y).toBeLessThan(pos.get('me')!.y);
    expect(pos.get('me')!.y).toBeLessThan(pos.get('kid')!.y);
    expect(pos.get('me')!.y).toBe(pos.get('wife')!.y);
  });

  it('keeps spouses next to each other', () => {
    const row = ['me', 'wife', 'sister'].sort((a, b) => pos.get(a)!.x - pos.get(b)!.x);
    expect(Math.abs(row.indexOf('me') - row.indexOf('wife'))).toBe(1);
  });

  it('puts friends and colleagues in a separate social column beside the family', () => {
    const familyXs = nodes.filter((n) => n.generation !== null).map((n) => pos.get(n.id)!.x);
    const fx = pos.get('friend')!.x;
    expect(fx < Math.min(...familyXs) || fx > Math.max(...familyXs)).toBe(true);
    expect(pos.get('friend')!.x).toBe(pos.get('colleague')!.x);
  });

  it('mirrors horizontally for right-to-left languages', () => {
    const rtl = generationLayout(nodes, edges, 'me', true);
    for (const n of nodes.filter((x) => x.generation !== null)) {
      expect(rtl.get(n.id)!.x).toBeCloseTo(-pos.get(n.id)!.x);
      expect(rtl.get(n.id)!.y).toBe(pos.get(n.id)!.y);
    }
  });
});
