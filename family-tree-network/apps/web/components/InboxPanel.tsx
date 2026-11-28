'use client';

import { useEffect, useState } from 'react';
import type { Api, RelationshipDetail } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function InboxPanel({ api, onChanged, onCount }: { api: Api; onChanged: () => void; onCount: (n: number) => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<RelationshipDetail[] | null>(null);
  const load = () =>
    api
      .awaiting()
      .then((r) => {
        setItems(r);
        onCount(r.length);
      })
      .catch(() => setItems([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  const decide = async (id: string, d: 'CONFIRM' | 'REJECT') => {
    await api.decide(id, d);
    await load();
    onChanged();
  };
  return (
    <div className="panel inbox" data-testid="inbox-panel">
      <h3>{t.inbox}</h3>
      {items === null && <p className="muted">{t.loading}</p>}
      {items?.length === 0 && <p className="muted">{t.inboxEmpty}</p>}
      <ul className="inbox-list">
        {items?.map((r) => (
          <li key={r.id} className="card inbox-item">
            <p className="sentence">
              <strong>{r.from.displayName}</strong> {t.isThe} <span style={{ color: r.color }}>{r.label}</span> {t.of} <strong>{r.to.displayName}</strong>
            </p>
            {r.sensitive && <p className="small note">{t.sensitiveNote}</p>}
            <div className="actions">
              <button className="btn small gold" onClick={() => decide(r.id, 'CONFIRM')} data-testid={`inbox-confirm-${r.id}`}>
                {t.confirm}
              </button>
              <button className="btn small" onClick={() => decide(r.id, 'REJECT')}>
                {t.reject}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
