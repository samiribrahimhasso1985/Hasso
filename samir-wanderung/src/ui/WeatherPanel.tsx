import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n';
import { Glass, ErrorBox, Spinner } from './components';
import { forecastWindow, getWeather, isThunder, WMO_ICON, type WeatherData } from '../engines/weather/WeatherEngine';
import type { LngLat } from '../engines/route/geo';

/** Current weather + forecast for the planned hike window. Shows source and fetch time. */
export function WeatherPanel({ coord, hours = 4, start }: { coord: LngLat; hours?: number; start?: Date }) {
  const { t, fmt } = useI18n();
  const [w, setW] = useState<WeatherData | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const ctl = new AbortController(); setErr(null); setW(null);
    getWeather(coord, ctl.signal).then(setW).catch((e) => { if (e.name !== 'AbortError') setErr(e); });
    return () => ctl.abort();
  }, [coord[0].toFixed(2), coord[1].toFixed(2), tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = w ? forecastWindow(w, start ?? new Date(), Math.ceil(hours)) : [];
  const thunder = rows.some((r) => isThunder(r.code));
  return (
    <Glass className="p-4 space-y-2" as="section" aria-label={t('weather.title')} data-testid="weather">
      <h2 className="font-display text-white">{t('weather.title')}</h2>
      {!w && !err && <Spinner label={t('common.loading')} />}
      {err != null && <><p className="text-sm text-amber-200">{t('weather.unavailable')}</p><ErrorBox error={err} onRetry={() => setTick((x) => x + 1)} /></>}
      {w?.current && (
        <div className="flex items-center gap-4">
          <div className="text-3xl" aria-hidden>{WMO_ICON[w.current.weather_code] ?? '·'}</div>
          <div className="text-sm">
            <div className="text-white text-lg">{fmt(w.current.temperature_2m)} °C</div>
            <div className="text-slate-300">{t('weather.wind')} {fmt(w.current.wind_speed_10m)} km/h · {t('weather.gusts')} {fmt(w.current.wind_gusts_10m)} km/h · {t('weather.precip')} {fmt(w.current.precipitation)} mm</div>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="text-xs w-full">
            <thead><tr className="text-slate-400"><th className="text-start pe-2">h</th><th>°C</th><th>%</th><th>mm</th><th>km/h</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.time} className="text-slate-200"><td className="pe-2">{r.time.slice(11, 16)} {WMO_ICON[r.code] ?? ''}</td><td className="text-center">{fmt(r.temp)}</td><td className="text-center">{r.pop ?? '–'}</td><td className="text-center">{fmt(r.precip)}{r.snow > 0 ? ` ❄${fmt(r.snow)}` : ''}</td><td className="text-center">{fmt(r.wind)}/{fmt(r.gusts)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {thunder && <p className="text-xs text-red-200" role="alert">⛈ Thunderstorm signal in the model forecast (WMO code ≥95). This is a forecast, not an official warning.</p>}
      {w && <p className="text-[11px] text-slate-500">{t('common.source')}: {w.attribution} · {t('common.updated')}: {new Date(w.fetchedAt).toLocaleString()} · {w.timezone}</p>}
      <p className="text-[11px] text-slate-400">{t('weather.alertsUnavailable')}</p>
      <p className="text-[11px] text-amber-200/80">{t('weather.notSafety')}</p>
    </Glass>
  );
}
