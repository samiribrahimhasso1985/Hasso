'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EventDetail from '../../../components/events/EventDetail';
import LanguageSwitch from '../../../components/LanguageSwitch';
import { Api, type EventDetailData } from '../../../lib/api';
import { I18nProvider, useI18n } from '../../../lib/i18n';
import '../../../components/events/events.css';

/** Shareable page of a PUBLIC event — readable without an account; registering leads to sign-in. */
function PublicEvent() {
  const { id } = useParams<{ id: string }>();
  const { locale, dir } = useI18n();
  const [data, setData] = useState<EventDetailData | null | 'missing'>(null);
  useEffect(() => {
    new Api(null, locale).publicEvent(id).then(setData).catch(() => setData('missing'));
  }, [id, locale]);
  return (
    <main className="ev ev-public" dir={dir} data-testid="ev-public">
      <div className="ev-public-top">
        <a href="/">EZIDINET</a>
        <LanguageSwitch />
      </div>
      {data === null && <p className="ev-muted">…</p>}
      {data === 'missing' && <p className="ev-empty">404</p>}
      {data && data !== 'missing' && <EventDetail api={null} data={data} signInHref={`/app?event=${data.id}`} />}
    </main>
  );
}

export default function Page() {
  return (
    <I18nProvider>
      <PublicEvent />
    </I18nProvider>
  );
}
