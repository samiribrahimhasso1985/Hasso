'use client';

import { useEffect, useRef, useState } from 'react';
import AccountPage from '../../components/AccountPage';
import { Api, ApiError } from '../../lib/api';
import { I18nProvider, useI18n } from '../../lib/i18n';
import { passwordStrength, useAuthText } from '../../lib/i18n-auth';

export default function ResetPage() {
  return (
    <I18nProvider>
      <Reset />
    </I18nProvider>
  );
}

function Reset() {
  const { t, locale } = useI18n();
  const a = useAuthText();
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const read = useRef(false);
  useEffect(() => {
    if (read.current) return; // effects can run twice (React strict mode): read the link only once
    read.current = true;
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    window.history.replaceState(null, '', '/reset'); // keep the token out of the address bar
  }, []);

  const strength = passwordStrength(pw);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError(a.passwordsDiffer);
    setBusy(true);
    setError(null);
    try {
      await new Api(null, locale).resetPassword(token, pw);
      setDone(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setError(
        code === 'TOKEN_INVALID' ? a.linkInvalid
          : code === 'PASSWORD_TOO_COMMON' ? a.pwCommon
            : code === 'PASSWORD_CONTAINS_EMAIL' ? a.pwEmail
              : code === 'PASSWORD_TOO_SHORT' ? a.pwTooShort
                : t.error,
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AccountPage title={a.resetTitle}>
        <p className="success" data-testid="reset-done">{a.resetDone}</p>
        <a className="btn gold" href="/app">{a.backToLogin}</a>
      </AccountPage>
    );
  }
  return (
    <AccountPage title={a.resetTitle}>
      <form className="account-form" onSubmit={submit} data-testid="reset-form" data-ready={token ? 'true' : 'false'}>
        <fieldset disabled={!token} className="plain">
        <label htmlFor="reset-pw">
          {t.password}
          <input id="reset-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={10} maxLength={200} autoComplete="new-password" dir="ltr" />
        </label>
        <div className={`strength s${strength}`} aria-live="polite">
          <span className="bar"><i /></span>
          <span className="small">{[a.strength0, a.strength1, a.strength2, a.strength3][strength]}</span>
        </div>
        <p className="muted small">{a.passwordHint}</p>
        <label htmlFor="reset-pw2">
          {a.confirmPassword}
          <input id="reset-pw2" type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={10} maxLength={200} autoComplete="new-password" dir="ltr" />
        </label>
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {a.showPassword}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn gold" type="submit" disabled={busy || strength === 0 || !token}>{a.savePassword}</button>
        </fieldset>
      </form>
    </AccountPage>
  );
}
