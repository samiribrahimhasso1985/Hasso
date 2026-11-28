/** Weather via the server's Open-Meteo proxy. No values are invented; failures surface as errors. */
import { api } from '../../core/api';
import type { LngLat } from '../route/geo';

export interface WeatherData {
  provider: string; attribution: string; fetchedAt: string; timezone: string; alerts: null; alertsNote: string;
  current?: { time: string; temperature_2m: number; precipitation: number; wind_speed_10m: number; wind_gusts_10m: number; weather_code: number };
  hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; precipitation: number[]; snowfall: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[]; weather_code: number[] };
  hourly_units?: Record<string, string>;
}

export const getWeather = (c: LngLat, signal?: AbortSignal) => api<WeatherData>(`/api/weather?lon=${c[0].toFixed(4)}&lat=${c[1].toFixed(4)}`, { signal });

/** Hourly rows within a planned window (start time + duration). */
export function forecastWindow(w: WeatherData, start: Date, hours: number) {
  if (!w.hourly) return [];
  const end = start.getTime() + hours * 3600_000;
  const rows = [];
  for (let i = 0; i < w.hourly.time.length; i++) {
    // Open-Meteo returns local time without offset when timezone=auto; compare as local wall time.
    const t = new Date(w.hourly.time[i]).getTime();
    if (t >= start.getTime() - 3600_000 && t <= end) rows.push({ time: w.hourly.time[i], temp: w.hourly.temperature_2m[i], pop: w.hourly.precipitation_probability[i], precip: w.hourly.precipitation[i], snow: w.hourly.snowfall[i], wind: w.hourly.wind_speed_10m[i], gusts: w.hourly.wind_gusts_10m[i], code: w.hourly.weather_code[i] });
  }
  return rows;
}

/** WMO weather codes that indicate thunderstorms (95–99). Shown as a forecast signal, not an official warning. */
export const isThunder = (code: number) => code >= 95;

export const WMO_ICON: Record<number, string> = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 85: '🌨️', 86: '❄️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
