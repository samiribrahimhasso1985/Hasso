/** Brand mark: one central person joined to four relationship circles — calm, palette colours only. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="EZIDINET">
      {[
        [24, 8, '#8B8C7A'],
        [40, 24, '#A68371'],
        [24, 40, '#9A877A'],
        [8, 24, '#808B92'],
      ].map(([x, y, c]) => (
        <g key={String(c)}>
          <line x1="24" y1="24" x2={x as number} y2={y as number} stroke={c as string} strokeWidth="1.6" />
          <circle cx={x as number} cy={y as number} r="4.2" fill="#FAF9F5" stroke={c as string} strokeWidth="1.6" />
        </g>
      ))}
      <circle cx="24" cy="24" r="6.5" fill="#30302D" />
    </svg>
  );
}
