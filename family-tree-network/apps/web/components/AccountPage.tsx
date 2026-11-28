'use client';

import type { ReactNode } from 'react';
import LanguageSwitch from './LanguageSwitch';
import { Logo } from './Logo';

/** Simple centred layout for the account pages (verify e-mail, reset password, developer mailbox). */
export default function AccountPage({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className="account-page">
      <header className="account-top">
        <a className="account-brand" href="/"><Logo size={30} /><span>EZIDINET</span></a>
        <LanguageSwitch />
      </header>
      <section className={`card account-card ${wide ? 'wide' : ''}`}>
        <h2>{title}</h2>
        {children}
      </section>
    </main>
  );
}
