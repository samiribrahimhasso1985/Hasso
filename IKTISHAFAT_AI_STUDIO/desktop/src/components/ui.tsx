import { ReactNode } from 'react'
export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="card">{title && <h3 className="mb-2 font-bold text-gold">{title}</h3>}{children}</div>
)
export const Badge = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-ok/20 text-ok' : 'bg-danger/20 text-danger'}`}>{children}</span>
)
export const ErrorBox = ({ msg }: { msg: string }) => <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger">{msg}</div>
