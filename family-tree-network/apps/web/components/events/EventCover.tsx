'use client';

import type { EventTemplate } from '../../lib/api';

/**
 * Designed cover art for an event or holy day — one visual language per template, with variations seeded by the
 * event's id so no two cards look the same. It is clearly a design, never presented as a historical photograph.
 */
const PALETTES: Record<EventTemplate, [string, string, string]> = {
  RELIGIOUS: ['#D7B45A', '#8C35D8', '#211329'],
  CULTURAL: ['#E83C91', '#8C35D8', '#211329'],
  HERITAGE: ['#D7B45A', '#E83C91', '#1a0f1f'],
  COMMUNITY: ['#176BCE', '#E83C91', '#0d1320'],
  MEMORIAL: ['#8C35D8', '#F5F3F7', '#0b0a10'],
  MUSIC: ['#E83C91', '#176BCE', '#0b0a14'],
  INTERNATIONAL: ['#176BCE', '#8C35D8', '#08101f'],
  ONLINE: ['#176BCE', '#D7B45A', '#08090D'],
  LOCAL: ['#D7B45A', '#E83C91', '#160d14'],
};

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export default function EventCover({ template, seed, className = '' }: { template: EventTemplate; seed: string; className?: string }) {
  const [a, b, bg] = PALETTES[template] ?? PALETTES.COMMUNITY;
  const r = rng(seed + template);
  const id = `c${seed.replace(/[^a-z0-9]/gi, '').slice(0, 10)}${template}`;
  const cx = 120 + r() * 160, cy = 70 + r() * 100;
  const motif = (() => {
    switch (template) {
      case 'RELIGIOUS': // radiant rays from a soft sun
        return (
          <g>
            {Array.from({ length: 28 }, (_, i) => {
              const ang = (i / 28) * Math.PI * 2 + r() * 0.05;
              return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang) * 420} y2={cy + Math.sin(ang) * 420} stroke={a} strokeOpacity={0.12 + (i % 2) * 0.1} strokeWidth={i % 3 === 0 ? 2 : 1} />;
            })}
            <circle cx={cx} cy={cy} r={34} fill={a} fillOpacity={0.85} />
            <circle cx={cx} cy={cy} r={60} fill="none" stroke={a} strokeOpacity={0.4} />
          </g>
        );
      case 'CULTURAL': // flowing ribbons
        return (
          <g fill="none" strokeWidth={10} strokeLinecap="round">
            {Array.from({ length: 5 }, (_, i) => {
              const y = 40 + i * 42 + r() * 20;
              return <path key={i} d={`M-20 ${y} C 90 ${y - 70 * r()} 220 ${y + 80 * r()} 420 ${y - 30}`} stroke={i % 2 ? a : b} strokeOpacity={0.55 - i * 0.07} />;
            })}
          </g>
        );
      case 'HERITAGE': // kilim-like diamond lattice
        return (
          <g>
            {Array.from({ length: 9 }, (_, i) =>
              Array.from({ length: 5 }, (_, j) => {
                const x = i * 50 + (j % 2) * 25, y = j * 50;
                return <path key={`${i}-${j}`} d={`M${x} ${y - 22} L${x + 22} ${y} L${x} ${y + 22} L${x - 22} ${y} Z`} fill={(i + j) % 3 === 0 ? a : 'none'} fillOpacity={0.35} stroke={(i + j) % 2 ? b : a} strokeOpacity={0.6} strokeWidth={1.5} />;
              }),
            )}
          </g>
        );
      case 'COMMUNITY': // people gathering in rings
        return (
          <g>
            {Array.from({ length: 3 }, (_, k) =>
              Array.from({ length: 10 + k * 6 }, (_, i) => {
                const n = 10 + k * 6, ang = (i / n) * Math.PI * 2 + k * 0.2;
                const rr = 34 + k * 30;
                return <circle key={`${k}-${i}`} cx={cx + Math.cos(ang) * rr} cy={cy + Math.sin(ang) * rr} r={5 - k} fill={k === 1 ? b : a} fillOpacity={0.85 - k * 0.2} />;
              }),
            )}
          </g>
        );
      case 'MEMORIAL': // a single quiet light
        return (
          <g>
            <circle cx={cx} cy={cy} r={90} fill={`url(#${id}-glow)`} />
            <rect x={cx - 6} y={cy + 6} width={12} height={46} rx={3} fill={b} fillOpacity={0.8} />
            <path d={`M${cx} ${cy - 18} C ${cx + 9} ${cy - 4} ${cx + 6} ${cy + 4} ${cx} ${cy + 6} C ${cx - 6} ${cy + 4} ${cx - 9} ${cy - 4} ${cx} ${cy - 18} Z`} fill="#D7B45A" />
          </g>
        );
      case 'MUSIC': // equalizer
        return (
          <g>
            {Array.from({ length: 26 }, (_, i) => {
              const h = 20 + r() * 150;
              return <rect key={i} x={10 + i * 15} y={220 - h} width={8} height={h} rx={4} fill={i % 2 ? a : b} fillOpacity={0.75} />;
            })}
          </g>
        );
      case 'INTERNATIONAL': // globe meridians
        return (
          <g fill="none" stroke={a} strokeOpacity={0.55}>
            <circle cx={cx} cy={cy} r={80} />
            {[20, 45, 70].map((rx) => <ellipse key={rx} cx={cx} cy={cy} rx={rx} ry={80} />)}
            {[-40, 0, 40].map((dy) => <line key={dy} x1={cx - Math.sqrt(6400 - dy * dy)} x2={cx + Math.sqrt(6400 - dy * dy)} y1={cy + dy} y2={cy + dy} />)}
            {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={cx + (r() - 0.5) * 140} cy={cy + (r() - 0.5) * 120} r={3} fill={b} stroke="none" />)}
          </g>
        );
      case 'ONLINE': // grid and a glowing screen
        return (
          <g>
            {Array.from({ length: 12 }, (_, i) => <line key={`v${i}`} x1={i * 36} y1={0} x2={i * 36} y2={240} stroke={a} strokeOpacity={0.18} />)}
            {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 36} x2={400} y2={i * 36} stroke={a} strokeOpacity={0.18} />)}
            <rect x={cx - 60} y={cy - 38} width={120} height={76} rx={10} fill={a} fillOpacity={0.25} stroke={b} strokeWidth={2} />
          </g>
        );
      default: // LOCAL: concentric place
        return (
          <g fill="none">
            {[18, 40, 66, 96].map((rr, i) => <circle key={rr} cx={cx} cy={cy} r={rr} stroke={i % 2 ? b : a} strokeOpacity={0.6 - i * 0.1} strokeWidth={2} />)}
            <circle cx={cx} cy={cy} r={7} fill={a} />
          </g>
        );
    }
  })();
  return (
    <svg className={`ev-cover ${className}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx={`${(cx / 400) * 100}%`} cy={`${(cy / 240) * 100}%`} r="90%">
          <stop offset="0%" stopColor={b} stopOpacity={0.55} />
          <stop offset="55%" stopColor={bg} />
          <stop offset="100%" stopColor="#08090D" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="#D7B45A" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#D7B45A" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${id}-bg)`} />
      {motif}
    </svg>
  );
}
