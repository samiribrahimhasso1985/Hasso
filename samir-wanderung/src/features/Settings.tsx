import { useEffect, useState } from 'react';
import { useI18n, LANGS, type Lang } from '../core/i18n';
import { useStore } from '../core/store';
import { AttributionList, Btn, Glass, Toggle } from '../ui/components';
import { deleteAllLocalData, storageEstimate } from '../engines/storage/db';
import { api, apiBase, setApiBase, isNativeApp, isDesktopApp, isStandalone } from '../core/api';
import { PROVIDERS } from '../config/providers';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { settings, setSettings } = useStore();
  const [status, setStatus] = useState<{ providers: { name: string; ok: boolean; ms?: number; error?: string }[]; ai: { configured: boolean; model: string } } | null>(null);
  const [storage, setStorage] = useState<number | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [server, setServer] = useState(apiBase());
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  useEffect(() => { api<typeof status>('/api/status').then(setStatus).catch(() => {}); storageEstimate().then((s) => setStorage(s.usage)); }, []);

  return (
    <div className="page max-w-3xl space-y-4">
      <h1 className="font-display text-2xl text-white">{t('settings.title')}</h1>
      <Glass className="p-4 space-y-2">
        <label className="field-label" htmlFor="set-lang">{t('settings.language')}</label>
        <select id="set-lang" className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
        <Toggle checked={settings.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} label={t('settings.reducedMotion')} />
        <Toggle checked={settings.lowPower} onChange={(v) => setSettings({ lowPower: v })} label={t('settings.lowPower')} />
        <Toggle checked={settings.batterySaver} onChange={(v) => setSettings({ batterySaver: v })} label="GPS battery saver (lower accuracy, fewer points)" />
        <p className="text-xs text-slate-500">{t('settings.units')}: metric (km, m, °C).</p>
      </Glass>
      <Glass className="p-4 space-y-2" as="section" aria-label="Server">
        <h2 className="font-display text-white">Server</h2>
        <p className="text-xs text-slate-400">
          {isDesktopApp() ? 'Desktop app: a built-in local server is running.' : isNativeApp() ? (isStandalone() ? 'Android app in standalone mode: maps, routing, search, weather and the atlas run directly on this device. Community and AI need a server.' : 'Android app connected to a server.') : 'Web app: using the server it was loaded from.'}
        </p>
        <div className="flex gap-2">
          <input className="field" type="url" inputMode="url" placeholder="https://your-server.example" value={server} onChange={(e) => setServer(e.target.value)} aria-label="Server URL" />
          <Btn onClick={async () => {
            setServerMsg(null);
            if (server && !/^https?:\/\//.test(server)) { setServerMsg('URL must start with https://'); return; }
            setApiBase(server);
            try { await api('/api/status'); setServerMsg(server ? '✓ connected' : '✓ standalone / same origin'); } catch (e) { setServerMsg('✕ ' + (e as Error).message); }
          }}>{t('common.save')}</Btn>
        </div>
        {serverMsg && <p className="text-xs text-slate-300">{serverMsg}</p>}
      </Glass>
      <Glass className="p-4 space-y-2">
        <h2 className="font-display text-white">{t('settings.privacy')}</h2>
        <ul className="text-xs text-slate-300 list-disc ps-5 space-y-1">
          <li>Journeys, GPS tracks, photos, offline maps and emergency contacts are stored only on this device (IndexedDB / Cache Storage).</li>
          <li>Your location is only read after you grant permission and is not sent to any server, except: coordinates you search/route (sent to the routing/geocoding/weather providers via our server), and live sharing that you explicitly enable in a community event.</li>
          <li>The server does not log request bodies or coordinates.</li>
        </ul>
        <p className="text-xs text-slate-400">{t('settings.storage')}: {storage != null ? `${(storage / 1e6).toFixed(1)} MB` : '?'}</p>
        <Btn variant="danger" onClick={async () => { if (confirm(t('settings.deleteConfirm'))) { await deleteAllLocalData(); setDeleted(true); } }}>{t('settings.deleteAll')}</Btn>
        {deleted && <p className="text-xs text-aqua-300">✓</p>}
      </Glass>
      <Glass className="p-4 space-y-2">
        <h2 className="font-display text-white">{t('settings.diagnostics')}</h2>
        {!status ? <p className="text-xs text-slate-400">…</p> : <ul className="text-xs space-y-1">
          {status.providers.map((p) => <li key={p.name}>{p.ok ? '🟢' : '🔴'} {p.name} {p.ok ? `${p.ms} ms` : p.error}</li>)}
          <li>{status.ai.configured ? '🟢' : '⚪'} AI assistant {status.ai.configured ? status.ai.model : 'not configured'}</li>
        </ul>}
      </Glass>
      <Glass className="p-4 space-y-2">
        <h2 className="font-display text-white">{t('settings.attribution')}</h2>
        <AttributionList ids={Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]} />
        <ul className="text-[11px] text-slate-500 space-y-0.5">{Object.values(PROVIDERS).filter((p) => p.note).map((p) => <li key={p.id}><b>{p.name}:</b> {p.note}</li>)}</ul>
      </Glass>
    </div>
  );
}
