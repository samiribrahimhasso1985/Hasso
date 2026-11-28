export class ApiError extends Error {
  constructor(public status: number, public code: string, public detail?: unknown) {
    super(code);
  }
}

interface CapacitorGlobal { isNativePlatform?: () => boolean; getPlatform?: () => string }
const cap = (): CapacitorGlobal | undefined => (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;

/** True inside the Android app (Capacitor). */
export const isNativeApp = (): boolean => !!cap()?.isNativePlatform?.();
/** True inside the desktop app (Electron preload sets this). */
export const isDesktopApp = (): boolean => !!(globalThis as { swDesktop?: unknown }).swDesktop;

/**
 * Server base URL. Priority: user setting (Settings → Server) → build-time VITE_API_BASE → same origin.
 * In the Android app there is no same-origin server, so an empty value means "standalone mode".
 */
export function apiBase(): string {
  try { const v = localStorage.getItem('sw.apiBase'); if (v) return v.replace(/\/$/, ''); } catch { /* ignore */ }
  return ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');
}
export function setApiBase(url: string) {
  try { url ? localStorage.setItem('sw.apiBase', url.replace(/\/$/, '')) : localStorage.removeItem('sw.apiBase'); } catch { /* ignore */ }
}
/** Standalone: provider requests run on the device, community/AI are unavailable. */
export const isStandalone = (): boolean => isNativeApp() && !apiBase();

/** Map a relative /api path to a full URL (for <img src>, links etc.). */
export const apiUrl = (path: string) => apiBase() + path;

export async function api<T>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const body = opts.body ?? (method === 'GET' ? undefined : {});
  if (isStandalone()) {
    const { handleLocally } = await import('./standalone');
    return handleLocally<T>(method, path, body);
  }
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: opts.signal,
      credentials: 'include',
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'network_unavailable');
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error ?? `http_${res.status}`;
    throw new ApiError(res.status, code, data);
  }
  return data as T;
}
