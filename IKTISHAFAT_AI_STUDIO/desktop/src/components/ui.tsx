import { ReactNode } from 'react'
export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="card">{title && <h3 className="mb-2 font-bold text-gold">{title}</h3>}{children}</div>
)
export const Badge = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{children}</span>
)
export const ErrorBox = ({ msg }: { msg: string }) => <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{msg}</div>
