'use client';

import { useEffect, useRef, useState } from 'react';
import AccountPage from '../../components/AccountPage';
import { Api } from '../../lib/api';
import { I18nProvider, useI18n } from '../../lib/i18n';
import { useAuthText } from '../../lib/i18n-auth';

export default function VerifyPage() {
  return (
    <I18nProvider>
      <Verify />
    </I18nProvider>
  );
}

function Verify() {
  const { locale } = useI18n();
  const a = useAuthText();
  const [state, setState] = useState<'working' | 'ok' | 'invalid'>('working');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // effects can run twice (React strict mode): use the link only once
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    // Remove the token from the address bar and history.
    window.history.replaceState(null, '', '/verify');
    new Api(null, locale).verifyEmail(token).then(() => setState('ok')).catch(() => setState('invalid'));
    // Run once with the token from the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AccountPage title={a.stepAccount}>
      <p data-testid="verify-result" className={state === 'ok' ? 'success' : state === 'invalid' ? 'error' : 'muted'}>
        {state === 'working' ? a.verifying : state === 'ok' ? a.verified : a.linkInvalid}
      </p>
      {state !== 'working' && <a className="btn gold" href="/">{a.toApp}</a>}
    </AccountPage>
  );
}
