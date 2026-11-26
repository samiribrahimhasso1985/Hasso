'use client';

import { useState } from 'react';
import type { Api, PathResult, PersonSummary } from '../lib/api';
import { useI18n } from '../lib/i18n';
import PersonPicker from './PersonPicker';
import StatusBadge from './StatusBadge';

/** "How Are We Connected?" — shortest verified path between two people. */
export default function ConnectPanel({
  api,
  from,
  to,
  setFrom,
  setTo,
  known,
  onResult,
}: {
  api: Api;
  from: PersonSummary | null;
  to: PersonSummary | null;
  setFrom: (p: PersonSummary | null) => void;
  setTo: (p: PersonSummary | null) => void;
  known: PersonSummary[];
  onResult: (r: PathResult | null) => void;
}) {
  const { t } = useI18n();
  const [includePending, setIncludePending] = useState(false);
  const [result, setResult] = useState<PathResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!from || !to) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.path(from.id, to.id, includePending);
      setResult(r);
      onResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const people = result?.found ? new Map(result.people.map((p) => [p.id, p])) : null;

  return (
    <div className="panel connect" data-testid="connect-panel">
      <h3>{t.howConnected}</h3>
      <label>{t.from}</label>
      <PersonPicker api={api} value={from} onChange={(p) => { setFrom(p); setResult(null); onResult(null); }} known={known} testId="pick-from" />
      <label>{t.to}</label>
      <PersonPicker api={api} value={to} onChange={(p) => { setTo(p); setResult(null); onResult(null); }} known={known} testId="pick-to" />
      <label className="check">
        <input type="checkbox" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} /> {t.includePending}
      </label>
      <button className="btn gold" disabled={!from || !to || busy} onClick={run} data-testid="btn-find-path">
        {t.findPath}
      </button>
      {err && <p className="error">{err}</p>}
      {result && !result.found && (
        <p className="no-path" data-testid="no-path">
          {result.message}
        </p>
      )}
      {result?.found && people && (
        <div className="path-result" data-testid="path-result">
          <div className={`path-verdict ${result.fullyVerified ? 'ok' : 'warn'}`}>
            {result.fullyVerified ? `✓ ${t.verifiedPath}` : `! ${t.unverifiedPath}`} · {result.steps.length} {t.steps}
          </div>
          {result.kinship && (
            <p className="kinship-line">
              <strong>{to?.displayName}</strong> {t.isThe} <span className="gold-text">{result.kinship.label}</span> {t.of} <strong>{from?.displayName}</strong>
            </p>
          )}
          <ol className="chain">
            <li className="chain-person">{people.get(result.steps[0]?.fromPersonId ?? from!.id)?.displayName}</li>
            {result.steps.map((s) => (
              <li key={s.edgeId} className="chain-step">
                <div className="chain-link" style={{ borderColor: s.color }}>
                  <span style={{ color: s.color }}>{s.label}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="chain-person">{people.get(s.toPersonId)?.displayName}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
