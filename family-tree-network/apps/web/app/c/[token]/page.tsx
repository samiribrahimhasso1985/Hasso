'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AddRelationshipDialog from '../../../components/AddRelationshipDialog';
import AuthScreen from '../../../components/AuthScreen';
import { avatarFor } from '../../../components/GraphCanvas';
import LanguageSwitch from '../../../components/LanguageSwitch';
import { Api, type PersonSummary, type QrResolution, type Session } from '../../../lib/api';
import { I18nProvider, useI18n } from '../../../lib/i18n';

const KEY = 'ftn.session';

/** Opened when someone scans a personal QR code. Shows the person; a relationship is only *requested*. */
export default function ScanPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);
  const onSession = (s: Session) => {
    setSession(s);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  };
  return (
    <I18nProvider>
      {!ready ? null : session ? <Scanned token={token} session={session} /> : <AuthScreen onSession={onSession} />}
    </I18nProvider>
  );
}

function Scanned({ token, session }: { token: string; session: Session }) {
  const { t, locale } = useI18n();
  const api = useMemo(() => new Api(session.accessToken, locale), [session.accessToken, locale]);
  const [res, setRes] = useState<QrResolution | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.resolveQr(token).then(setRes).catch(() => setInvalid(true));
  }, [api, token]);

  const me: PersonSummary = { id: session.profileId, displayName: session.displayName, gender: 'UNSPECIFIED', avatarUrl: null, isMinor: false, claimed: true, deceased: false };

  return (
    <main className="scan-page">
      <div className="card scan-card" data-testid="scan-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <LanguageSwitch />
        </div>
        {invalid && (
          <p className="no-path" data-testid="qr-invalid">
            {t.qrInvalid}
          </p>
        )}
        {res && (
          <>
            <img src={avatarFor(res.person.displayName, true)} alt="" width={84} height={84} />
            <h2 data-testid="scanned-name">{res.person.displayName}</h2>
            {res.ezidId && (
              <p className="muted" dir="ltr">
                {res.ezidId}
              </p>
            )}
            {!res.isSelf && (
              <>
                <p className="small muted">{t.qrHelp}</p>
                <button className="btn gold" onClick={() => setAdding(true)} data-testid="btn-send-request">
                  {t.sendRequest}
                </button>
              </>
            )}
          </>
        )}
        <p style={{ marginTop: 18 }}>
          <a className="link" href="/app">
            {t.myView}
          </a>
        </p>
      </div>
      {adding && res && <AddRelationshipDialog api={api} me={me} known={[res.person]} initialPerson={res.person} onClose={() => setAdding(false)} onCreated={() => undefined} />}
    </main>
  );
}
