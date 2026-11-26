'use client';

import { useState } from 'react';
import { Api, ApiError, type Session } from '../lib/api';
import { useI18n } from '../lib/i18n';
import LanguageSwitch from './LanguageSwitch';
import { Logo } from './Logo';

const DEMO = ['omar', 'anna', 'khaled', 'sara', 'karim', 'peter', 'julia', 'daniel'];
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === 'true';

export default function AuthScreen({ onSession }: { onSession: (s: Session) => void }) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent, override?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = new Api(null, locale);
      const s =
        mode === 'login' || override
          ? await api.login(override?.email ?? email, override?.password ?? password)
          : await api.register({ email, password, displayName, gender: 'UNSPECIFIED', locale });
      onSession(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <section className="auth-hero" aria-hidden="true">
        <Constellation />
        <div className="auth-hero-text">
          <Logo size={56} />
          <h1>{t.appName}</h1>
          <p className="tagline">{t.tagline}</p>
          <p className="muted">{t.welcomeBody}</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-top">
          <LanguageSwitch />
        </div>
        <form className="card auth-card" onSubmit={submit}>
          <h2>{mode === 'login' ? t.login : t.register}</h2>
          {mode === 'register' && (
            <label>
              {t.displayName}
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={80} />
            </label>
          )}
          <label>
            {t.email}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" dir="ltr" />
          </label>
          <label>
            {t.password}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 10 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              dir="ltr"
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn gold" disabled={busy} type="submit">
            {mode === 'login' ? t.login : t.register}
          </button>
          <p className="muted small">
            {mode === 'login' ? t.noAccount : t.haveAccount}{' '}
            <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t.register : t.login}
            </button>
          </p>
        </form>
        {SHOW_DEMO && (
          <div className="card demo">
            <h3>{t.demoAccounts}</h3>
            <div className="chips">
              {DEMO.map((k) => (
                <button
                  key={k}
                  className="chip"
                  type="button"
                  data-testid={`demo-${k}`}
                  onClick={() => submit(undefined, { email: `${k}@demo.ftn.local`, password: 'demo-password-2026' })}
                >
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            <p className="muted small">{t.demoNote}</p>
          </div>
        )}
      </section>
    </main>
  );
}

/** Decorative animated network for the welcome screen. */
function Constellation() {
  const pts = [
    [50, 46], [30, 26], [70, 24], [18, 52], [82, 50], [36, 74], [64, 76], [50, 12], [12, 30], [88, 28], [24, 88], [78, 90],
  ];
  const lines: [number, number, string][] = [
    [0, 1, '#25A9FF'], [0, 2, '#25A9FF'], [0, 3, '#FF4D91'], [0, 4, '#E8B94F'], [0, 5, '#25A9FF'], [0, 6, '#A56BFF'],
    [1, 7, '#25A9FF'], [2, 7, '#25A9FF'], [1, 8, '#43D99A'], [2, 9, '#E8B94F'], [5, 10, '#25A9FF'], [6, 11, '#A56BFF'], [3, 5, '#43D99A'],
  ];
  return (
    <svg className="constellation" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map(([a, b, c], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={c} strokeWidth={0.35} opacity={0.75} filter="url(#glow)" className="c-line" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 3.2 : 1.8} fill={i === 0 ? '#FFD978' : '#13243D'} stroke="#E8B94F" strokeWidth={0.4} filter="url(#glow)" className="c-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </svg>
  );
}
