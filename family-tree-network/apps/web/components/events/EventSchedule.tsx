'use client';

import { useMemo, useState } from 'react';
import type { EventSessionData } from '../../lib/api';
import { EV, useEv } from '../../lib/i18n-events';
import { timeOnly } from './format';

/** Program table: time, activity, stage, speaker/artist, status — filterable by stage; scrolls on phones. */
export default function EventSchedule({ sessions, timeZone }: { sessions: EventSessionData[]; timeZone: string }) {
  const { tx, locale } = useEv();
  const stages = useMemo(() => [...new Set(sessions.map((s) => s.stage).filter((x): x is string => Boolean(x)))], [sessions]);
  const [stage, setStage] = useState<string>('');
  const now = Date.now();
  const shown = sessions.filter((s) => !stage || s.stage === stage);
  const state = (s: EventSessionData) => {
    if (s.status === 'CANCELLED') return 'cancelled';
    if (s.status === 'LIVE' || (new Date(s.startsAt).getTime() <= now && new Date(s.endsAt).getTime() >= now)) return 'live';
    if (new Date(s.endsAt).getTime() < now || s.status === 'DONE') return 'done';
    return 'scheduled';
  };
  const label: Record<string, Record<string, string>> = { cancelled: EV.cancelled, live: EV.happening, done: EV.ended, scheduled: EV.st_PUBLISHED };
  return (
    <div className="ev-schedule" data-testid="ev-schedule">
      {stages.length > 1 && (
        <div className="ev-stage-filter" role="group">
          <button type="button" aria-pressed={!stage} onClick={() => setStage('')}>{tx(EV.allStages)}</button>
          {stages.map((s) => <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>{s}</button>)}
        </div>
      )}
      <div className="ev-table-wrap">
        <table className="ev-table">
          <tbody>
            {shown.map((s, i) => {
              const st = state(s);
              return (
                <tr key={s.id ?? i} className={st}>
                  <td className="ev-time">{timeOnly(s.startsAt, timeZone, locale)}<small>{timeOnly(s.endsAt, timeZone, locale)}</small></td>
                  <td>
                    <strong>{s.title}</strong>
                    {s.host && <small>{s.host}</small>}
                  </td>
                  <td className="ev-stage">{s.stage ?? ''}</td>
                  <td>{st !== 'scheduled' && <span className={`ev-pill ${st}`}>{tx(label[st])}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
