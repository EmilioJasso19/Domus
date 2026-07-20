import { Global, Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordLogger } from './discord.logger';

// Global: DiscordService queda inyectable en cualquier módulo sin importarlo,
// por si quieres enviar embeds manualmente además del reenvío automático de logs.
@Global()
@Module({
  providers: [DiscordService, DiscordLogger],
  exports: [DiscordService, DiscordLogger],
})
export class DiscordModule {}
