'use client';

import { useEffect, useState } from 'react';
import { Api } from '../lib/api';
import { fill, useAuthText } from '../lib/i18n-auth';

/** Reminds the person to confirm their e-mail address until they have done so. */
export default function AccountBanner({ api }: { api: Api }) {
  const a = useAuthText();
  const [me, setMe] = useState<{ email: string; emailVerified?: boolean; mailbox?: string | null } | null>(null);
  const [sent, setSent] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    api.me().then((m) => live && setMe(m)).catch(() => undefined);
    return () => { live = false; };
  }, [api]);

  if (!me || me.emailVerified !== false || hidden) return null;
  return (
    <div className="account-banner" role="status" data-testid="verify-banner">
      <span>{fill(a.verifyBanner, { email: me.email })}</span>
      {sent ? (
        <span className="muted">{a.resent}</span>
      ) : (
        <button className="btn small" type="button" onClick={() => api.resendVerification().then(() => setSent(true)).catch(() => undefined)}>
          {a.resend}
        </button>
      )}
      {me.mailbox === 'developer' && (
        <a className="btn small ghost" href="/dev/mailbox" data-testid="open-mailbox">{a.devMailbox}</a>
      )}
      <button className="link small" type="button" aria-label="×" onClick={() => setHidden(true)}>×</button>
    </div>
  );
}
