import { useCallback, useEffect, useState } from 'react'
import { api, ProviderStatus } from './api'
const ls = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lset = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

export function useAI() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]); const [secure, setSecure] = useState(true)
  const [active, setActiveS] = useState(ls('ai.active') || 'ollama')
  const [models, setModels] = useState<Record<string, string>>(() => JSON.parse(ls('ai.models') || '{}'))
  const [fallback, setFallbackS] = useState(ls('ai.fallback') === '1')
  const refresh = useCallback(() => api.aiProviders().then(r => { setProviders(r.providers); setSecure(r.secure_store) }).catch(() => setProviders([])), [])
  useEffect(() => { refresh() }, [refresh])
  const setActive = (p: string) => { lset('ai.active', p); setActiveS(p) }
  const setModel = (p: string, m: string) => { const n = { ...models, [p]: m }; lset('ai.models', JSON.stringify(n)); setModels(n) }
  const setFallback = (v: boolean) => { lset('ai.fallback', v ? '1' : '0'); setFallbackS(v) }
  const modelFor = (p: string) => models[p] || providers.find(x => x.id === p)?.models[0] || ''
  return { providers, secure, active, setActive, models, setModel, modelFor, fallback, setFallback, refresh }
}
export type AI = ReturnType<typeof useAI>
