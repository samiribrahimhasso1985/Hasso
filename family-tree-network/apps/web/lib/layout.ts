/**
 * "Generations" layout: family members in horizontal rows by generation
 * (older generations on top), ordered with a barycentre heuristic so that
 * spouses sit together and children sit under their parents.
 * People without a generation (friends, colleagues, acquaintances) form a
 * separate social column beside the family block.
 * In RTL the layout is mirrored so the family reads right-to-left.
 */
export interface LNode {
  id: string;
  generation: number | null;
}
export interface LEdge {
  source: string;
  target: string;
  category: string;
}

const ROW = 150;
const COL = 125;

export function generationLayout(nodes: LNode[], edges: LEdge[], focusId: string, rtl: boolean): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const family = nodes.filter((n) => n.generation !== null);
  const social = nodes.filter((n) => n.generation === null);
  const rows = new Map<number, string[]>();
  for (const n of family) {
    const g = n.generation as number;
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(n.id);
  }
  const gens = [...rows.keys()].sort((a, b) => a - b);
  const neighbours = new Map<string, Set<string>>();
  const unions = new Map<string, Set<string>>();
  for (const e of edges) {
    if (e.category !== 'FAMILY' && e.category !== 'UNION') continue;
    for (const [a, b] of [
      [e.source, e.target],
      [e.target, e.source],
    ]) {
      if (!neighbours.has(a)) neighbours.set(a, new Set());
      neighbours.get(a)!.add(b);
      if (e.category === 'UNION') {
        if (!unions.has(a)) unions.set(a, new Set());
        unions.get(a)!.add(b);
      }
    }
  }
  // initial order: focus first in its row, then stable by id
  for (const g of gens) rows.get(g)!.sort((a, b) => (a === focusId ? -1 : b === focusId ? 1 : a < b ? -1 : 1));

  const index = () => {
    const m = new Map<string, number>();
    for (const g of gens) rows.get(g)!.forEach((id, i) => m.set(id, i - (rows.get(g)!.length - 1) / 2));
    return m;
  };
  // barycentre sweeps (down and up)
  for (let pass = 0; pass < 6; pass++) {
    const order = pass % 2 === 0 ? gens : [...gens].reverse();
    for (const g of order) {
      const x = index();
      const row = rows.get(g)!;
      const bary = (id: string) => {
        const ns = [...(neighbours.get(id) ?? [])].filter((n) => x.has(n));
        if (!ns.length) return x.get(id)!;
        return ns.reduce((s, n) => s + x.get(n)!, 0) / ns.length;
      };
      const b = new Map(row.map((id) => [id, bary(id)]));
      row.sort((p, q) => b.get(p)! - b.get(q)!);
      // keep spouses adjacent
      for (let i = 0; i < row.length; i++) {
        for (const sp of unions.get(row[i]) ?? []) {
          const j = row.indexOf(sp);
          if (j > i + 1) {
            row.splice(j, 1);
            row.splice(i + 1, 0, sp);
          }
        }
      }
    }
  }
  const x = index();
  const mirror = rtl ? -1 : 1;
  for (const g of gens) for (const id of rows.get(g)!) pos.set(id, { x: mirror * x.get(id)! * COL, y: g * ROW });

  // Social column on the side of the focus person, so friend/colleague ties stay short.
  const xs = [...pos.values()].map((p) => p.x);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 0;
  const focusX = pos.get(focusId)?.x ?? 0;
  const side = focusX <= (minX + maxX) / 2 ? -1 : 1;
  const sx = side < 0 ? minX - COL * 1.6 : maxX + COL * 1.6;
  // group the social column by circle (friends, colleagues, …)
  const ORDER = ['FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL', 'CUSTOM'];
  const catOf = new Map<string, number>();
  for (const e of edges) {
    for (const id of [e.source, e.target]) {
      const rank = ORDER.indexOf(e.category);
      if (rank >= 0 && (!catOf.has(id) || rank < catOf.get(id)!)) catOf.set(id, rank);
    }
  }
  social
    .sort((a, b) => (catOf.get(a.id) ?? 9) - (catOf.get(b.id) ?? 9) || (a.id < b.id ? -1 : 1))
    .forEach((n, i) => {
      const col = Math.floor(i / 6);
      const r = i % 6;
      pos.set(n.id, { x: sx + side * col * COL, y: (pos.get(focusId)?.y ?? 0) + (r - Math.min(5, social.length - 1) / 2) * (ROW * 0.62) });
    });
  return pos;
}
