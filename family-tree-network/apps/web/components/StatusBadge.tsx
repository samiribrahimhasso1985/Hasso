'use client';

import type { Status } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  const icon = status === 'CONFIRMED' ? '✓' : status === 'PENDING' ? '…' : status === 'DISPUTED' ? '!' : '×';
  return (
    <span className={`badge ${status.toLowerCase()}`} data-status={status}>
      <span aria-hidden="true">{icon}</span> {t[status]}
    </span>
  );
}
