'use client';

import { useEffect, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import Dashboard from '../components/Dashboard';
import { Api, SESSION_ENDED_EVENT, type Session } from '../lib/api';
import { I18nProvider } from '../lib/i18n';

const KEY = 'ftn.session';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<'sessionEnded' | null>(null);

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
    if (s) setNotice(null);
    try {
      if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  // The server ended the session (logout on another device, password reset, expiry): back to sign-in.
  useEffect(() => {
    const ended = () => {
      onSession(null);
      setNotice('sessionEnded');
    };
    window.addEventListener(SESSION_ENDED_EVENT, ended);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, ended);
  }, []);

  const logout = async () => {
    // End the session on the server too, so the token cannot be used again.
    if (session) await new Api(session.accessToken, 'en').logout().catch(() => undefined);
    onSession(null);
  };

  return (
    <I18nProvider>
      {!ready ? null : session ? <Dashboard session={session} onLogout={logout} /> : <AuthScreen onSession={onSession} notice={notice} />}
    </I18nProvider>
  );
}
