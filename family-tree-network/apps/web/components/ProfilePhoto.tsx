'use client';

import { useEffect, useRef, useState } from 'react';
import { photoSrc, type Api, type PhotoVisibility } from '../lib/api';
import { usePhotoText } from '../lib/i18n-photo';
import { avatarFor } from './GraphCanvas';

const VIEW = 240; // editor viewport (CSS px)
const OUT = 512; // saved photo size (px)

/**
 * The signed-in person's profile photo: take or choose a photo, drag/zoom into a square, save as a 512×512 JPEG.
 * Re-encoding in the browser also drops the original file's metadata; the server removes any that remains.
 */
export default function ProfilePhoto({
  api,
  profileId,
  displayName,
  onChanged,
}: {
  api: Api;
  profileId: string;
  displayName: string;
  onChanged: () => void;
}) {
  const p = usePhotoText();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PhotoVisibility>('NETWORK');
  const [editing, setEditing] = useState<HTMLImageElement | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.profile(profileId).then((d) => {
      setAvatar(photoSrc(d.avatarUrl));
      if (d.photoVisibility) setVisibility(d.photoVisibility);
    }).catch(() => undefined);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profileId]);

  const pick = (file: File | undefined) => {
    setMsg(null);
    if (!file || !file.type.startsWith('image/')) return file && setMsg({ ok: false, text: p.photoError });
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setEditing(img);
    img.onerror = () => { URL.revokeObjectURL(url); setMsg({ ok: false, text: p.photoError }); };
    img.src = url;
  };

  const save = async (dataUrl: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await api.setPhoto(dataUrl);
      setEditing(null);
      await load();
      setMsg({ ok: true, text: p.photoSaved });
      onChanged();
    } catch {
      setMsg({ ok: false, text: p.photoError });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="photo-section" data-testid="profile-photo">
      <h4>{p.photoTitle}</h4>
      <div className="photo-row">
        <img className="photo-current" src={avatar ?? avatarFor(displayName, true)} alt="" width={88} height={88} data-testid="photo-current" />
        <div className="photo-buttons">
          <label className="btn small">
            {p.takePhoto}
            <input type="file" accept="image/*" capture="user" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <label className="btn small">
            {avatar ? p.changePhoto : p.choosePhoto}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" hidden data-testid="photo-input"
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {avatar && (
            <button className="btn small danger" type="button" data-testid="photo-remove"
              onClick={async () => { await api.removePhoto().catch(() => undefined); await load(); setAvatar(null); onChanged(); }}>
              {p.removePhoto}
            </button>
          )}
        </div>
      </div>
      <p className="small muted">{p.photoHelp}</p>
      {avatar && (
        <label className="photo-vis">
          {p.whoSees}
          <select value={visibility} data-testid="photo-visibility"
            onChange={async (e) => {
              const v = e.target.value as PhotoVisibility;
              setVisibility(v);
              await api.setPhotoVisibility(v).catch(() => undefined);
              onChanged();
            }}>
            {(['NETWORK', 'FAMILY', 'PUBLIC', 'PRIVATE'] as const).map((v) => (
              <option key={v} value={v}>{p[`vis${v}`]}</option>
            ))}
          </select>
        </label>
      )}
      {msg && <p className={`small ${msg.ok ? 'success' : 'error'}`} role="status">{msg.text}</p>}
      {editing && <Cropper img={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}
    </section>
  );
}

/** Square crop with drag and zoom (mouse and touch via pointer events). */
function Cropper({ img, busy, onCancel, onSave }: { img: HTMLImageElement; busy: boolean; onCancel: () => void; onSave: (d: string) => void }) {
  const p = usePhotoText();
  const base = VIEW / Math.min(img.naturalWidth, img.naturalHeight); // "cover" scale at zoom 1
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset of the image centre from the viewport centre (CSS px)
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  const scale = base * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  // Keep the square covered: the image may not move past its edges.
  const clamp = (x: number, y: number) => ({
    x: Math.max(-(w - VIEW) / 2, Math.min((w - VIEW) / 2, x)),
    y: Math.max(-(h - VIEW) / 2, Math.min((h - VIEW) / 2, y)),
  });
  useEffect(() => setPos((q) => clamp(q.x, q.y)), [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const export512 = () => {
    const c = document.createElement('canvas');
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext('2d')!;
    const k = OUT / VIEW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, ((VIEW - w) / 2 + pos.x) * k, ((VIEW - h) / 2 + pos.y) * k, w * k, h * k);
    onSave(c.toDataURL('image/jpeg', 0.86));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="crop-title" data-testid="photo-editor">
      <div className="card cropper">
        <h3 id="crop-title">{p.editTitle}</h3>
        <p className="small muted">{p.editHelp}</p>
        <div
          className="crop-view"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            setPos(clamp(d.px + e.clientX - d.x, d.py + e.clientY - d.y));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: w, height: h, left: (VIEW - w) / 2 + pos.x, top: (VIEW - h) / 2 + pos.y }}
          />
          <span className="crop-ring" aria-hidden="true" />
        </div>
        <label className="crop-zoom">
          {p.zoom}
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} data-testid="photo-zoom" />
        </label>
        <div className="step-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>{p.cancel}</button>
          <button type="button" className="btn gold" disabled={busy} onClick={export512} data-testid="photo-save">
            {busy ? p.saving : p.save}
          </button>
        </div>
      </div>
    </div>
  );
}
