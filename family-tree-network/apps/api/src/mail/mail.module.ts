import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { OutboxController } from './outbox.controller';

@Global()
@Module({ providers: [MailService], controllers: [OutboxController], exports: [MailService] })
export class MailModule {}
