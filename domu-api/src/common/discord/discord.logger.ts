import { ConsoleLogger, Injectable } from '@nestjs/common';
import { DiscordService, DISCORD_LOG_CONTEXT } from './discord.service';

// Logger de la app: imprime en consola como siempre (ConsoleLogger) y además
// reenvía TODO lo registrado a nivel `error` a Discord como embed. Captura tanto
// los `logger.error(...)` de los servicios (p.ej. RemindersService) como las
// excepciones no controladas que Nest registra vía ExceptionsHandler.
@Injectable()
export class DiscordLogger extends ConsoleLogger {
  constructor(private readonly discord: DiscordService) {
    super();
  }

  error(message: any, ...optionalParams: any[]): void {
    super.error(message, ...optionalParams);

    // Los Logger de Nest delegan como error(message, stack?, context?). El stack
    // es el string multilínea; el context es el string corto de una sola línea.
    let stack: string | undefined;
    let context: string | undefined;
    for (const param of optionalParams) {
      if (typeof param !== 'string') continue;
      if (param.includes('\n')) stack = param;
      else context = param;
    }

    // Evita bucles: no reenviar errores originados por el propio envío a Discord.
    if (context === DISCORD_LOG_CONTEXT) return;

    const title =
      typeof message === 'string'
        ? message
        : (message?.message ?? 'Unhandled error');

    void this.discord.sendError({
      title,
      context,
      stack: stack ?? (message instanceof Error ? message.stack : undefined),
    });
  }
}
