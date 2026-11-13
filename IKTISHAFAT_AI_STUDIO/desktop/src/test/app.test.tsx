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
    fireEvent.click(screen.getByText(dict.ar.camera, { exact: false }))
    expect(await screen.findByText(dict.ar.notImpl, { exact: false })).toBeTruthy()
  })
})
