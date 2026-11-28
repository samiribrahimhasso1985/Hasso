'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { Api, IdentityMe } from '../lib/api';
import { useI18n } from '../lib/i18n';
import ProfilePhoto from './ProfilePhoto';

/** The QR encodes only a link with an opaque random token — never personal data (spec §5, §24.2). */
export const qrLink = (token: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/c/${token}`;

export default function IdentityPanel({ api, profileId, onChanged }: { api: Api; profileId: string; onChanged: () => void }) {
  const { t } = useI18n();
  const [me, setMe] = useState<IdentityMe | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => api.identityMe().then(setMe).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  useEffect(() => {
    if (!me?.qr) return setSvg(null);
    QRCode.toString(qrLink(me.qr.token), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#30302D', light: '#FAF9F5' } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [me?.qr]);

  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const download = async () => {
    if (!me?.qr) return;
    const url = await QRCode.toDataURL(qrLink(me.qr.token), { width: 768, margin: 2, color: { dark: '#30302D', light: '#FFFFFF' } });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${me.ezidId}-qr.png`;
    a.click();
  };

  if (!me) return <div className="panel muted">{err ?? t.loading}</div>;
  return (
    <div className="panel identity" data-testid="identity-panel">
      <h3>{t.myIdentity}</h3>
      <div className="id-card card">
        <div className="small muted">{t.ezidId}</div>
        <div className="ezid" data-testid="ezid-id" dir="ltr">
          {me.ezidId}
        </div>
        <div className="id-name">{me.displayName}</div>
      </div>

      <ProfilePhoto api={api} profileId={profileId} displayName={me.displayName} onChanged={onChanged} />

      <h4>{t.qrTitle}</h4>
      <p className="small muted">{t.qrHelp}</p>
      {!me.qrEnabled && <p className="note small">{t.qrDisabled}</p>}
      {me.qr && svg ? (
        <div className="qr-box" data-testid="qr-image" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <button className="btn gold" onClick={() => act(() => api.createQr())} data-testid="btn-qr-create">
          {t.qrCreate}
        </button>
      )}
      {me.qr && (
        <div className="actions">
          <button className="btn small" onClick={download}>
            {t.qrDownload}
          </button>
          <button
            className="btn small"
            onClick={async () => {
              await navigator.clipboard?.writeText(qrLink(me.qr!.token)).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? t.linkCopied : t.copyLink}
          </button>
          <button className="btn small" onClick={() => act(() => api.createQr())} data-testid="btn-qr-regenerate">
            {t.qrRegenerate}
          </button>
          <button className="btn small danger" onClick={() => act(() => api.revokeQr())} data-testid="btn-qr-revoke">
            {t.qrRevoke}
          </button>
        </div>
      )}

      <h4>{t.visibility}</h4>
      <label className="check">
        <input type="checkbox" checked={me.qrEnabled} onChange={(e) => act(() => api.identitySettings({ qrEnabled: e.target.checked }))} /> {t.qrEnable}
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={me.discoverable}
          onChange={(e) => act(() => api.identitySettings({ discoverable: e.target.checked }))}
          data-testid="toggle-discoverable"
        />{' '}
        {t.discoverable}
      </label>
      <p className="small muted">{t.discoverableHelp}</p>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
