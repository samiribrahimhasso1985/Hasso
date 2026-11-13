export const API = (window as any).studio?.apiBase ?? 'http://127.0.0.1:8765'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${r.status}`)
  }
  return r.json()
}

export interface Project { id: number; name: string; description: string; stage: string; language: string; folder: string; created_at: string; updated_at: string }
export interface Media { id: number; path: string; kind: string; size_bytes: number; duration: number | null; width: number | null; height: number | null; fps: number | null; codec: string | null; meta_source: string; status: string; duplicate: boolean }
export interface Dashboard { project_count: number; current_project: Project | null; recent_projects: Project[]; media_counts: Record<string, number>; media_missing: number; tasks: { name: string; status: string; detail: string; at: string }[]; davinci: string; storage: { data_dir: string; free_gb: number; total_gb: number }; local_ai: boolean }
export interface Diagnostics { platform: any; ffmpeg: any; ffprobe: any; davinci: any; local_ai: any; storage: any }

export const api = {
  health: () => req<{ status: string }>('/api/health'),
  dashboard: () => req<Dashboard>('/api/dashboard'),
  diagnostics: () => req<Diagnostics>('/api/diagnostics'),
  projects: () => req<Project[]>('/api/projects'),
  createProject: (b: { name: string; description: string; language: string }) => req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(b) }),
  deleteProject: (id: number) => req<{ backup: string }>(`/api/projects/${id}?confirm=true`, { method: 'DELETE' }),
  backupProject: (id: number) => req<{ backup: string }>(`/api/projects/${id}/backup`, { method: 'POST' }),
  media: (id: number, kind?: string, q?: string) => req<Media[]>(`/api/projects/${id}/media?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(q ? { q } : {}) })}`),
  importMedia: (id: number, path: string) => req<Media>(`/api/projects/${id}/media`, { method: 'POST', body: JSON.stringify({ path }) }),
}
