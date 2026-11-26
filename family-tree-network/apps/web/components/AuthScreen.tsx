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
          <Logo size={48} />
          <div className="brand-word">EZIDNET</div>
          <h1>{t.tagline}</h1>
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

/** Decorative line drawing of a network for the welcome screen — thin lines, palette colours, no glow. */
function Constellation() {
  const pts = [
    [56, 40], [38, 22], [74, 20], [26, 46], [86, 44], [42, 64], [70, 66], [56, 8], [18, 24], [92, 18], [30, 84], [82, 86],
  ];
  const lines: [number, number, string][] = [
    [0, 1, '#8B8C7A'], [0, 2, '#8B8C7A'], [0, 3, '#A68371'], [0, 4, '#808B92'], [0, 5, '#8B8C7A'], [0, 6, '#9A877A'],
    [1, 7, '#8B8C7A'], [2, 7, '#8B8C7A'], [1, 8, '#858078'], [2, 9, '#808B92'], [5, 10, '#8B8C7A'], [6, 11, '#9A877A'], [3, 5, '#858078'],
  ];
  return (
    <svg className="constellation" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {lines.map(([a, b, c], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={c} strokeWidth={0.25} className="c-line" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 2.6 : 1.5} fill={i === 0 ? '#30302D' : '#FAF9F5'} stroke="#858078" strokeWidth={0.25} className="c-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </svg>
  );
}
