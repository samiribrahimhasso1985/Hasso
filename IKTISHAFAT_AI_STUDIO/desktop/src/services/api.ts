export const API = (window as any).studio?.apiBase ?? 'http://127.0.0.1:8765'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${r.status}`)
  }
  return r.json()
}

export interface Project { id: number; name: string; description: string; stage: string; language: string; format_id: string; aspect: string; width: number; height: number; fps: number; folder: string; created_at: string; updated_at: string }
export interface Media { id: number; path: string; kind: string; size_bytes: number; duration: number | null; width: number | null; height: number | null; fps: number | null; codec: string | null; meta_source: string; status: string; duplicate: boolean; fit: { status: string; crop_percent?: number; axis?: string } | null }
export interface Dashboard { project_count: number; current_project: Project | null; recent_projects: Project[]; media_counts: Record<string, number>; media_missing: number; tasks: { name: string; status: string; detail: string; at: string }[]; davinci: string; storage: { data_dir: string; free_gb: number; total_gb: number }; local_ai: boolean }
export interface Diagnostics { platform: any; ffmpeg: any; ffprobe: any; davinci: any; local_ai: any; storage: any }

export interface ProviderStatus { id: string; label: string; configured: boolean; reachable: boolean | null; models: string[] }
export interface Overview { project: { id: number; name: string; stage: string; updated_at: string }; resolution: string | null; fps: number | null; timeline_duration: number; clip_count: number; media_count: number; thumb_media_id: number | null; target: { aspect: string; width: number; height: number; fps: number } }
export interface Clip { id: number; media_id: number; name: string; kind: string; track: string; start: number; duration: number }
export interface Task { id: number; name: string; detail: string; status: string; progress: number; remaining_s: number | null }
export interface Resources { cpu: number; ram: number; gpu: number | null }
export interface DavinciStatus { status: string; note: string; connection: { connected: boolean; version: string | null; current_project: string | null; error: string | null } }

export interface Formats { presets: { id: string; aspect: string; width: number; height: number; use: string }[]; fps: number[] }

export const api = {
  formats: () => req<Formats>('/api/formats'),
  mediaUrl: (id: number) => `${API}/api/media/${id}/file`,
  thumbUrl: (id: number) => `${API}/api/media/${id}/thumbnail`,
  overview: (id: number) => req<Overview>(`/api/projects/${id}/overview`),
  timeline: (id: number) => req<{ clips: Clip[]; duration: number; tracks: string[] }>(`/api/projects/${id}/timeline`),
  addClip: (id: number, media_id: number, track: string) => req<{ id: number }>(`/api/projects/${id}/timeline/clips`, { method: 'POST', body: JSON.stringify({ media_id, track }) }),
  delClip: (id: number, cid: number) => req<unknown>(`/api/projects/${id}/timeline/clips/${cid}`, { method: 'DELETE' }),
  exportEdl: (id: number) => req<{ path: string }>(`/api/projects/${id}/export/edl`, { method: 'POST' }),
  analyze: (mid: number) => req<{ task_id: number }>(`/api/media/${mid}/analyze`, { method: 'POST' }),
  tasks: () => req<Task[]>('/api/tasks'),
  cancelTask: (id: number) => req<unknown>(`/api/tasks/${id}/cancel`, { method: 'POST' }),
  resources: () => req<Resources>('/api/system/resources'),
  aiProviders: () => req<{ providers: ProviderStatus[]; secure_store: boolean }>('/api/ai/providers'),
  aiSetKey: (p: string, key: string) => req<unknown>(`/api/ai/providers/${p}/key`, { method: 'PUT', body: JSON.stringify({ key }) }),
  aiDelKey: (p: string) => req<unknown>(`/api/ai/providers/${p}/key`, { method: 'DELETE' }),
  aiTest: (p: string) => req<{ ok: boolean; models: string[]; error: string | null }>(`/api/ai/providers/${p}/test`, { method: 'POST' }),
  assist: (b: { project_id: number | null; provider: string; model: string; prompt: string; history: { role: string; content: string }[]; allow_fallback: boolean; fallback_models: Record<string, string> }) =>
    req<{ provider: string; model: string; text: string; fallback_used: boolean }>('/api/assistant', { method: 'POST', body: JSON.stringify(b) }),
  davinci: () => req<DavinciStatus>('/api/davinci/status'),
  davinciTimeline: (id: number) => req<{ verified: boolean; timeline: string; clips: number }>(`/api/projects/${id}/davinci/timeline`, { method: 'POST', body: JSON.stringify({ approved: true }) }),
  health: () => req<{ status: string }>('/api/health'),
  dashboard: () => req<Dashboard>('/api/dashboard'),
  diagnostics: () => req<Diagnostics>('/api/diagnostics'),
  projects: () => req<Project[]>('/api/projects'),
  createProject: (b: { name: string; description: string; language: string; format_id: string; fps: number; width?: number; height?: number }) => req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(b) }),
  deleteProject: (id: number) => req<{ backup: string }>(`/api/projects/${id}?confirm=true`, { method: 'DELETE' }),
  backupProject: (id: number) => req<{ backup: string }>(`/api/projects/${id}/backup`, { method: 'POST' }),
  media: (id: number, kind?: string, q?: string) => req<Media[]>(`/api/projects/${id}/media?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(q ? { q } : {}) })}`),
  importMedia: (id: number, path: string) => req<Media>(`/api/projects/${id}/media`, { method: 'POST', body: JSON.stringify({ path }) }),
}
