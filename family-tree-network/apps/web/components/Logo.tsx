/** Brand mark: a gold node joined to four coloured relationship circles. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Family Tree Network">
      <circle cx="24" cy="24" r="22" fill="#0D1B30" stroke="#E8B94F" strokeOpacity="0.5" />
      {[
        [24, 9, '#25A9FF'],
        [39, 24, '#FF4D91'],
        [24, 39, '#A56BFF'],
        [9, 24, '#43D99A'],
      ].map(([x, y, c]) => (
        <g key={String(c)}>
          <line x1="24" y1="24" x2={x as number} y2={y as number} stroke={c as string} strokeWidth="2" strokeLinecap="round" />
          <circle cx={x as number} cy={y as number} r="4" fill="#13243D" stroke={c as string} strokeWidth="1.6" />
        </g>
      ))}
      <circle cx="24" cy="24" r="6.5" fill="#E8B94F" stroke="#FFD978" strokeWidth="1.2" />
    </svg>
  );
}
