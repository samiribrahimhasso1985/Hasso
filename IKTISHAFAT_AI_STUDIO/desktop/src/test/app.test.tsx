import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { NAV } from '../modules/nav'
import { dict } from '../i18n'

afterEach(cleanup)
describe('app shell', () => {
  it('has 18 sections and all translated in ar/de/en', () => {
    expect(NAV).toHaveLength(18)
    for (const l of ['ar', 'de', 'en'] as const) for (const n of NAV) expect(dict[l][n.id], `${l}:${n.id}`).toBeTruthy()
  })
  it('shows disconnected when backend is down and sets RTL for Arabic', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    render(<App />)
    expect(document.documentElement.dir).toBe('rtl')
    fireEvent.click(screen.getAllByText(dict.ar.camera, { exact: false })[0])
    expect(await screen.findByText(dict.ar.notImpl, { exact: false })).toBeTruthy()
  })
})

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DE } from '../i18n/de'

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? sources(p) : p.endsWith('.tsx') && !p.includes('/test/') ? [p] : [] })
}
describe('German coverage', () => {
  it('every L(lang, ar, en) text has a German translation', () => {
    const re = /L\(lang,\s*(?:'(?:[^'\\]|\\.)*'|`[^`]*`),\s*(?:'((?:[^'\\]|\\.)*)'|`([^`]*)`)(,\s*[`'])?/g
    const missing: string[] = []
    for (const f of sources(join(__dirname, '..'))) {
      const s = readFileSync(f, 'utf8'); let m
      while ((m = re.exec(s))) { const en = (m[1] ?? m[2]).replace(/\\'/g, "'"); if (!m[3] && !DE[en]) missing.push(en) }
    }
    expect(missing).toEqual([])
  })
})

describe('dictionary coverage', () => {
  it("every t(lang, 'key') used exists in ar, en and de", () => {
    const used = new Set<string>()
    for (const f of sources(join(__dirname, '..'))) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(lang,\s*'(\w+)'\)/g)) used.add(m[1])
    for (const l of ['ar', 'en', 'de'] as const) expect([...used].filter(k => !dict[l][k]), l).toEqual([])
  })
})
