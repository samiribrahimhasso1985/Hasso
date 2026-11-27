'use client';

import { useEffect, useState } from 'react';
import AccountPage from '../../../components/AccountPage';
import { Api, type OutboxMessage } from '../../../lib/api';
import { I18nProvider, useI18n } from '../../../lib/i18n';
import { useAuthText } from '../../../lib/i18n-auth';

/** Developer mailbox: shows account e-mails in local test versions (the API returns 404 elsewhere). */
export default function MailboxPage() {
  return (
    <I18nProvider>
      <Mailbox />
    </I18nProvider>
  );
}

function Mailbox() {
  const { locale } = useI18n();
  const a = useAuthText();
  const [messages, setMessages] = useState<OutboxMessage[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const load = () => new Api(null, locale).outbox().then((r) => setMessages(r.messages)).catch(() => setUnavailable(true));
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [locale]);

  // Links are shown relative to this site, so they work on any address (computer, phone on the same Wi-Fi).
  const local = (link: string) => {
    try {
      const u = new URL(link);
      return `${u.pathname}${u.search}`;
    } catch {
      return link;
    }
  };

  return (
    <AccountPage title={a.devMailbox} wide>
      <p className="note small">{a.devMailboxNote}</p>
      {unavailable && <p className="muted">404</p>}
      {messages && messages.length === 0 && <p className="muted">{a.noMessages}</p>}
      <ul className="mailbox" data-testid="mailbox">
        {messages?.map((m) => (
          <li key={m.id}>
            <div className="mail-head">
              <strong>{m.subject}</strong>
              <span className="muted small" dir="ltr">{m.to} · {new Date(m.createdAt).toLocaleString(locale === 'ku' ? 'en' : locale)}</span>
            </div>
            <p className="small mail-text">{m.text.split('\n')[0]}</p>
            <a className="btn small gold" href={local(m.link)} data-testid="mail-link">{a.open}</a>
          </li>
        ))}
      </ul>
    </AccountPage>
  );
}
