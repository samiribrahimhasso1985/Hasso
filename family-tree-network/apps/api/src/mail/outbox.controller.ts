import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { MailService } from './mail.service';

/**
 * Developer mailbox: only exists when MAIL_TRANSPORT=outbox.
 * On a server reachable from the internet, OUTBOX_KEY must be set: the mailbox then answers only with ?key=<OUTBOX_KEY>,
 * because it contains sign-in links of every account.
 */
@Controller('dev')
export class OutboxController {
  constructor(private readonly mail: MailService) {}

  @Public()
  @Get('outbox')
  outbox(@Query('key') key?: string) {
    const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found');
    if (!this.mail.outboxEnabled) throw notFound();
    const required = process.env.OUTBOX_KEY;
    if (required) {
      const a = Buffer.from(key ?? '');
      const b = Buffer.from(required);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw notFound();
    }
    return { messages: this.mail.list() };
  }
}
