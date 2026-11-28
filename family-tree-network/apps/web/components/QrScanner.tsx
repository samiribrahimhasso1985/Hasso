'use client';

import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useScanText } from '../lib/i18n-scan';
import { tokenFromQr } from '../lib/qr-scan';

type State = 'starting' | 'scanning' | 'nocamera' | 'denied' | 'found';

/** Reads a frame or image into pixels and looks for a QR code. */
function decode(source: CanvasImageSource, w: number, h: number, canvas: HTMLCanvasElement): string | null {
  const scale = Math.min(1, 720 / Math.max(w, h));
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

/**
 * Camera QR scanner. Scanning only opens /c/<token> on this site, where the person can send a request —
 * it never creates a relationship (spec §24.3). Falls back to choosing a photo when no camera is available.
 */
export default function QrScanner({ onClose }: { onClose: () => void }) {
  const s = useScanText();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>('starting');
  const [hint, setHint] = useState<string | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const handle = useCallback((text: string | null, fromPhoto: boolean) => {
    if (!text) {
      if (fromPhoto) setHint(s.scanNothing);
      return false;
    }
    const token = tokenFromQr(text);
    if (!token) {
      setHint(s.scanNotEzid);
      return false;
    }
    setState('found');
    stop();
    window.location.assign(`/c/${token}`);
    return true;
  }, [s, stop]);

  useEffect(() => {
    canvas.current = document.createElement('canvas');
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState('nocamera');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (ms) => {
        if (cancelled) return ms.getTracks().forEach((t) => t.stop());
        stream.current = ms;
        const v = video.current!;
        v.srcObject = ms;
        await v.play().catch(() => undefined);
        setState('scanning');
        const tick = () => {
          if (cancelled || !stream.current) return;
          if (v.readyState >= 2 && v.videoWidth > 0 && canvas.current) {
            if (handle(decode(v, v.videoWidth, v.videoHeight, canvas.current), false)) return;
          }
          timer = setTimeout(tick, 180);
        };
        tick();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'nocamera');
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stop();
    };
  }, [handle, stop]);

  const fromPhoto = async (file: File | undefined) => {
    if (!file || !canvas.current) return;
    setHint(null);
    try {
      const bmp = await createImageBitmap(file);
      handle(decode(bmp, bmp.width, bmp.height, canvas.current), true);
      bmp.close();
    } catch {
      setHint(s.scanNothing);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scan-title" data-testid="qr-scanner">
      <div className="card scanner">
        <h3 id="scan-title">{s.scanTitle}</h3>
        <p className="small muted">{s.scanHelp}</p>
        <div className={`scan-view ${state === 'scanning' ? 'live' : ''}`}>
          <video ref={video} playsInline muted aria-hidden="true" />
          {state === 'scanning' && <span className="scan-frame" aria-hidden="true" />}
          {state === 'starting' && <p className="scan-msg muted">{s.scanStarting}</p>}
          {state === 'found' && <p className="scan-msg">{s.scanFound}</p>}
          {(state === 'nocamera' || state === 'denied') && (
            <p className="scan-msg muted" data-testid="scan-nocamera">{state === 'denied' ? s.scanDenied : s.scanNoCamera}</p>
          )}
        </div>
        {hint && <p className="error small" role="alert" data-testid="scan-hint">{hint}</p>}
        <div className="scan-actions">
          <label className="btn">
            {s.scanPhoto}
            <input type="file" accept="image/*" capture="environment" hidden data-testid="scan-photo"
              onChange={(e) => fromPhoto(e.target.files?.[0])} />
          </label>
          <button type="button" className="btn ghost" onClick={() => { stop(); onClose(); }}>{s.close}</button>
        </div>
      </div>
    </div>
  );
}
