import { useEffect, useState } from 'react';

interface BatteryManager extends EventTarget { level: number; charging: boolean }

/** Battery (Battery Status API, where available), connectivity and storage. No predictions. */
export function useDeviceHealth() {
  const [battery, setBattery] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    let bm: BatteryManager | null = null;
    const upd = () => { if (bm) { setBattery(bm.level); setCharging(bm.charging); } };
    (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }).getBattery?.().then((b) => { bm = b; upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd); }).catch(() => {});
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    navigator.storage?.estimate?.().then((e) => e.usage != null && e.quota != null && setStorage({ usage: e.usage, quota: e.quota })).catch(() => {});
    return () => { removeEventListener('online', on); removeEventListener('offline', off); bm?.removeEventListener('levelchange', upd); bm?.removeEventListener('chargingchange', upd); };
  }, []);
  return { battery, charging, online, storage };
}
