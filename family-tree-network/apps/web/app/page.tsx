'use client';

import { useEffect, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import Dashboard from '../components/Dashboard';
import type { Session } from '../lib/api';
import { I18nProvider } from '../lib/i18n';

const KEY = 'ftn.session';

export default function Home() {
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

  const onSession = (s: Session | null) => {
    setSession(s);
    try {
      if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <I18nProvider>
      {!ready ? null : session ? <Dashboard session={session} onLogout={() => onSession(null)} /> : <AuthScreen onSession={onSession} />}
    </I18nProvider>
  );
}
