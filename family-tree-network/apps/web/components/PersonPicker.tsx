'use client';

import { useEffect, useState } from 'react';
import type { Api, PersonSummary } from '../lib/api';
import { useI18n } from '../lib/i18n';

/** Search people (server-side, privacy-filtered) or pick from people already in the graph. */
export default function PersonPicker({
  api,
  value,
  onChange,
  known,
  testId,
}: {
  api: Api;
  value: PersonSummary | null;
  onChange: (p: PersonSummary | null) => void;
  known: PersonSummary[];
  testId?: string;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const local = known.filter((p) => p.displayName.toLowerCase().includes(q.trim().toLowerCase()));
    setResults(local);
    const h = setTimeout(() => {
      api
        .search(q)
        .then((r) => {
          const ids = new Set(local.map((p) => p.id));
          setResults([...local, ...r.filter((p) => !ids.has(p.id))]);
        })
        .catch(() => undefined);
    }, 220);
    return () => clearTimeout(h);
  }, [q, api, known]);

  if (value) {
    return (
      <div className="picked" data-testid={testId}>
        <span className="mini-avatar">{[...value.displayName][0]}</span>
        <span>{value.displayName}</span>
        <button type="button" className="icon" aria-label="clear" onClick={() => onChange(null)}>
          ×
        </button>
      </div>
    );
  }
  return (
    <div className="picker">
      <input
        value={q}
        placeholder={t.searchPeople}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      {open && q.trim().length >= 2 && (
        <ul className="picker-results" role="listbox">
          {results.length === 0 && <li className="muted small">{t.noResults}</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange(p);
                  setQ('');
                  setOpen(false);
                }}
              >
                <span className="mini-avatar">{[...p.displayName][0]}</span>
                {p.displayName}
                {p.isMinor && <span className="tag">🛡</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
