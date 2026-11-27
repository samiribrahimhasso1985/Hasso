'use client';

import { useEffect, useMemo, useState } from 'react';
import { Api, ApiError, type Session } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ALL_COUNTRIES, PRIORITY_COUNTRIES, countryName, fill, passwordStrength, useAuthText } from '../lib/i18n-auth';
import LanguageSwitch from './LanguageSwitch';
import { Logo } from './Logo';

const DEMO = ['omar', 'anna', 'khaled', 'sara', 'karim', 'peter', 'julia', 'daniel'];
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === 'true';
type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ onSession, notice }: { onSession: (s: Session) => void; notice?: 'sessionEnded' | 'resetDone' | null }) {
  const { t, locale } = useI18n();
  const a = useAuthText();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [consents, setConsents] = useState({ terms: false, sensitive: false, age: false });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mailbox, setMailbox] = useState(false);

  // The website's "Create account" button opens this screen with ?mode=register.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('mode');
    if (m === 'register' || m === 'forgot') setMode(m);
  }, []);
  useEffect(() => {
    if (notice) setInfo(a[notice]);
  }, [notice, a]);

  const go = (m: Mode) => {
    setMode(m);
    setStep(1);
    setError(null);
    setInfo(null);
  };

  const explain = (err: unknown): string => {
    if (!(err instanceof ApiError)) return t.error;
    switch (err.code) {
      case 'TOO_MANY_ATTEMPTS': {
        const secs = Number((err.body as { retryAfterSeconds?: number })?.retryAfterSeconds ?? 900);
        return fill(a.tooMany, { m: Math.max(1, Math.ceil(secs / 60)) });
      }
      case 'EMAIL_TAKEN': return a.emailTaken;
      case 'PASSWORD_TOO_SHORT': return a.pwTooShort;
      case 'PASSWORD_TOO_COMMON': return a.pwCommon;
      case 'PASSWORD_CONTAINS_EMAIL': return a.pwEmail;
      default: return err.message;
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const login = (e?: React.FormEvent, override?: { email: string; password: string }) => {
    e?.preventDefault();
    return run(async () => onSession(await new Api(null, locale).login(override?.email ?? email, override?.password ?? password)));
  };

  const strength = passwordStrength(password);
  const step1Valid = displayName.trim().length > 0 && /.+@.+\..+/.test(email) && strength > 0 && password === password2;

  const registerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (password !== password2) return setError(a.passwordsDiffer);
      if (strength === 0) return setError(a.pwTooShort);
      setError(null);
      return setStep(2);
    }
    if (step === 2) return setStep(3);
    return run(async () => {
      const s = await new Api(null, locale).register({
        email, password, displayName, gender: 'UNSPECIFIED', locale,
        country: country || undefined,
        acceptTerms: consents.terms, consentSensitiveData: consents.sensitive, confirmMinimumAge: consents.age,
      });
      onSession(s);
    });
  };

  const forgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const api = new Api(null, locale);
      await api.forgotPassword(email);
      setInfo(a.forgotSent);
      setMailbox(await api.outbox().then(() => true).catch(() => false));
    });
  };

  const countries = useMemo(() => {
    const rest = ALL_COUNTRIES.filter((c) => !PRIORITY_COUNTRIES.includes(c))
      .map((c) => ({ c, n: countryName(c, locale) }))
      .sort((x, y) => x.n.localeCompare(y.n, locale));
    return { top: PRIORITY_COUNTRIES.map((c) => ({ c, n: countryName(c, locale) })), rest };
  }, [locale]);

  const pwField = (value: string, set: (v: string) => void, label: string, id: string, autoComplete: string) => (
    <label htmlFor={id}>
      {label}
      <input id={id} type={showPw ? 'text' : 'password'} value={value} onChange={(e) => set(e.target.value)} required
        minLength={mode === 'login' ? 1 : 10} maxLength={200} autoComplete={autoComplete} dir="ltr" />
    </label>
  );

  return (
    <main className="auth">
      <section className="auth-hero" aria-hidden="true">
        <Constellation />
        <div className="auth-hero-text">
          <Logo size={48} />
          <div className="brand-word">EZIDINET</div>
          <h1>{t.tagline}</h1>
          <p className="muted">{t.welcomeBody}</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-top">
          <LanguageSwitch />
        </div>

        {mode === 'login' && (
          <form className="card auth-card" onSubmit={login} data-testid="login-form">
            <h2>{t.login}</h2>
            {info && <p className="note" role="status">{info}</p>}
            <label htmlFor="login-email">
              {t.email}
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" dir="ltr" />
            </label>
            {pwField(password, setPassword, t.password, 'login-password', 'current-password')}
            <label className="check">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> {a.showPassword}
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn gold" disabled={busy} type="submit">{t.login}</button>
            <p className="muted small auth-links">
              <button type="button" className="link" onClick={() => go('forgot')} data-testid="to-forgot">{a.forgot}</button>
            </p>
            <p className="muted small">
              {t.noAccount}{' '}
              <button type="button" className="link" onClick={() => go('register')} data-testid="to-register">{t.register}</button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form className="card auth-card" onSubmit={registerSubmit} data-testid="register-form" noValidate={step === 3}>
            <p className="muted small step-label">{fill(a.stepOf, { n: step })}</p>
            <div className="steps-bar" aria-hidden="true">
              {[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'on' : ''} />)}
            </div>
            <h2>{step === 1 ? a.stepAccount : step === 2 ? a.stepAbout : a.stepConsent}</h2>

            {step === 1 && (
              <>
                <label htmlFor="reg-name">
                  {t.displayName}
                  <input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={80} autoComplete="nickname" />
                </label>
                <label htmlFor="reg-email">
                  {t.email}
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" dir="ltr" />
                </label>
                {pwField(password, setPassword, t.password, 'reg-password', 'new-password')}
                <div className={`strength s${strength}`} aria-live="polite">
                  <span className="bar"><i /></span>
                  <span className="small">{[a.strength0, a.strength1, a.strength2, a.strength3][strength]}</span>
                </div>
                <p className="muted small">{a.passwordHint}</p>
                {pwField(password2, setPassword2, a.confirmPassword, 'reg-password2', 'new-password')}
                <label className="check">
                  <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> {a.showPassword}
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <label htmlFor="reg-country">
                  {a.country}
                  <select id="reg-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">{a.countryNone}</option>
                    <optgroup label="—">
                      {countries.top.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
                    </optgroup>
                    <optgroup label="—">
                      {countries.rest.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
                    </optgroup>
                  </select>
                </label>
                <p className="muted small">{a.countryHint}</p>
                <p className="muted small">{a.languageHint}</p>
              </>
            )}

            {step === 3 && (
              <>
                <p className="muted small">{a.consentIntro}</p>
                <label className="check consent">
                  <input type="checkbox" id="c-terms" checked={consents.terms} onChange={(e) => setConsents({ ...consents, terms: e.target.checked })} />
                  <span>{a.consentTerms}</span>
                </label>
                <label className="check consent">
                  <input type="checkbox" id="c-sensitive" checked={consents.sensitive} onChange={(e) => setConsents({ ...consents, sensitive: e.target.checked })} />
                  <span>{a.consentSensitive}</span>
                </label>
                <label className="check consent">
                  <input type="checkbox" id="c-age" checked={consents.age} onChange={(e) => setConsents({ ...consents, age: e.target.checked })} />
                  <span>{a.consentAge}</span>
                </label>
                <details className="consent-details">
                  <summary>{a.consentWhat}</summary>
                  <p className="muted small">{a.consentDetails}</p>
                </details>
              </>
            )}

            {error && <p className="error" role="alert">{error}</p>}
            <div className="step-actions">
              {step > 1 && (
                <button type="button" className="btn ghost" onClick={() => { setError(null); setStep((step - 1) as 1 | 2); }}>{a.back}</button>
              )}
              <button className="btn gold" type="submit" data-testid="register-next"
                disabled={busy || (step === 1 && !step1Valid) || (step === 3 && !(consents.terms && consents.sensitive && consents.age))}>
                {step < 3 ? a.next : a.createAccount}
              </button>
            </div>
            <p className="muted small">
              {t.haveAccount}{' '}
              <button type="button" className="link" onClick={() => go('login')}>{t.login}</button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form className="card auth-card" onSubmit={forgotSubmit} data-testid="forgot-form">
            <h2>{a.forgotTitle}</h2>
            <p className="muted small">{a.forgotIntro}</p>
            <label htmlFor="forgot-email">
              {t.email}
              <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" dir="ltr" />
            </label>
            {info && <p className="note" role="status">{info}</p>}
            {info && mailbox && <p className="small"><a href="/dev/mailbox">{a.devMailbox}</a></p>}
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn gold" disabled={busy} type="submit">{a.sendLink}</button>
            <p className="muted small">
              <button type="button" className="link" onClick={() => go('login')}>{a.backToLogin}</button>
            </p>
          </form>
        )}

        {SHOW_DEMO && mode === 'login' && (
          <div className="card demo">
            <h3>{t.demoAccounts}</h3>
            <div className="chips">
              {DEMO.map((k) => (
                <button key={k} className="chip" type="button" data-testid={`demo-${k}`}
                  onClick={() => login(undefined, { email: `${k}@demo.ftn.local`, password: 'demo-password-2026' })}>
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
