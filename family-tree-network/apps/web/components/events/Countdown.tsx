'use client';

import { useEffect, useState } from 'react';
import { EV, useEv } from '../../lib/i18n-events';

/** Live countdown to the start; "happening now" during the event; "ended" afterwards. */
export default function Countdown({ startsAt, endsAt, cancelled }: { startsAt: string; endsAt: string; cancelled: boolean }) {
  const { tx } = useEv();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (cancelled) return <p className="ev-countdown off">{tx(EV.cancelled)}</p>;
  const s = new Date(startsAt).getTime(), e = new Date(endsAt).getTime();
  if (now > e) return <p className="ev-countdown off">{tx(EV.ended)}</p>;
  if (now >= s) return <p className="ev-countdown live">● {tx(EV.happening)}</p>;
  const m = Math.floor((s - now) / 60000);
  const parts: [number, string][] = [[Math.floor(m / 1440), tx(EV.days)], [Math.floor((m % 1440) / 60), tx(EV.hours)], [m % 60, tx(EV.minutes)]];
  return (
    <div className="ev-countdown" data-testid="ev-countdown">
      <span className="lbl">{tx(EV.startsIn)}</span>
      {parts.map(([n, l]) => (
        <span key={l} className="unit"><b>{n}</b><small>{l}</small></span>
      ))}
    </div>
  );
}
