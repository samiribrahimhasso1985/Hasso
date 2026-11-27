import { Controller, Get, HttpStatus } from '@nestjs/common';
import { Public } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { MailService } from './mail.service';

/** Developer mailbox: only exists when MAIL_TRANSPORT=outbox (local development and EZIDINET Desktop). */
@Controller('dev')
export class OutboxController {
  constructor(private readonly mail: MailService) {}

  @Public()
  @Get('outbox')
  outbox() {
    if (!this.mail.outboxEnabled) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found');
    return { messages: this.mail.list() };
  }
}
