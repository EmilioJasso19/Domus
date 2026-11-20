import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Global: MailService queda inyectable en cualquier módulo sin importarlo.
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
