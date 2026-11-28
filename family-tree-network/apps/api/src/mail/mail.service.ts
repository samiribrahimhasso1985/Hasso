import { Injectable, Logger } from '@nestjs/common';

export interface OutboxMessage {
  id: number;
  to: string;
  subject: string;
  text: string;
  link: string;
  createdAt: string;
}

type Kind = 'verify' | 'reset';

const TEXT: Record<string, Record<Kind, { subject: string; body: string }>> = {
  en: {
    verify: { subject: 'Confirm your e-mail address — EZIDINET', body: 'Welcome to EZIDINET. Open this link to confirm your e-mail address (valid for 24 hours):' },
    reset: { subject: 'Reset your password — EZIDINET', body: 'Open this link to choose a new password (valid for 1 hour). If you did not ask for this, ignore this message:' },
  },
  de: {
    verify: { subject: 'Bestätige deine E-Mail-Adresse — EZIDINET', body: 'Willkommen bei EZIDINET. Öffne diesen Link, um deine E-Mail-Adresse zu bestätigen (24 Stunden gültig):' },
    reset: { subject: 'Passwort zurücksetzen — EZIDINET', body: 'Öffne diesen Link, um ein neues Passwort zu wählen (1 Stunde gültig). Wenn du das nicht angefordert hast, ignoriere diese Nachricht:' },
  },
  ar: {
    verify: { subject: 'أكّد بريدك الإلكتروني — EZIDINET', body: 'أهلاً بك في EZIDINET. افتح هذا الرابط لتأكيد بريدك الإلكتروني (صالح 24 ساعة):' },
    reset: { subject: 'إعادة تعيين كلمة المرور — EZIDINET', body: 'افتح هذا الرابط لاختيار كلمة مرور جديدة (صالح ساعة واحدة). إن لم تطلب ذلك فتجاهل هذه الرسالة:' },
  },
  ku: {
    verify: { subject: 'Navnîşana e-nameya xwe bipejirîne — EZIDINET', body: 'Bi xêr hatî EZIDINET. Vê girêdanê veke da ku navnîşana e-nameya xwe bipejirînî (24 saetan derbasdar e):' },
    reset: { subject: 'Şîfreya xwe nû bike — EZIDINET', body: 'Vê girêdanê veke da ku şîfreyeke nû hilbijêrî (1 saet derbasdar e). Heke te ev daxwaz nekiribe, guh nede vê peyamê:' },
  },
};

/**
 * Sends account e-mails. Transports:
 *  - "outbox"  (default outside production): messages are kept in memory and shown in the developer mailbox
 *               (GET /api/dev/outbox) — for local testing and EZIDINET Desktop; nothing leaves the computer.
 *  - "disabled" (default in production until an e-mail provider is chosen): messages are not sent.
 * A real provider (SMTP/API) is added here once the owner chooses one.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private readonly outbox: OutboxMessage[] = [];
  private seq = 0;
  readonly transport = process.env.MAIL_TRANSPORT ?? (process.env.NODE_ENV === 'production' ? 'disabled' : 'outbox');
  private readonly appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  get outboxEnabled() {
    return this.transport === 'outbox';
  }

  async send(kind: Kind, to: string, token: string, locale: string) {
    const t = (TEXT[locale] ?? TEXT.en)[kind];
    const link = `${this.appUrl}/${kind === 'verify' ? 'verify' : 'reset'}?token=${encodeURIComponent(token)}`;
    if (this.transport === 'outbox') {
      this.outbox.unshift({ id: ++this.seq, to, subject: t.subject, text: `${t.body}\n${link}`, link, createdAt: new Date().toISOString() });
      this.outbox.splice(50);
      return;
    }
    // Never log the link (it is a credential); only that a message could not be delivered.
    this.log.warn(`E-mail transport "${this.transport}": ${kind} message not delivered (no provider configured).`);
  }

  list(): OutboxMessage[] {
    return this.outbox;
  }
}
