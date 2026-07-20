import { Injectable } from '@nestjs/common';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordErrorPayload {
  title: string;
  description?: string;
  context?: string;
  stack?: string;
  fields?: DiscordEmbedField[];
}

// Rojo de Discord (danger).
const DISCORD_RED = 0xed4245;
// Límites de Discord (con margen de seguridad): título 256, descripción 4096,
// valor de campo 1024.
const MAX_TITLE = 256;
const MAX_DESC = 4000;
const MAX_FIELD = 1024;

// Contexto reservado: el propio servicio nunca debe reenviar sus errores a
// Discord (evita bucles). El DiscordLogger lo respeta.
export const DISCORD_LOG_CONTEXT = 'DiscordService';

@Injectable()
export class DiscordService {
  // Evita inundar el canal cuando un mismo error se repite (p.ej. el cron que
  // corre cada minuto): descarta duplicados dentro de una ventana corta.
  private readonly lastSent = new Map<string, number>();
  private readonly dedupeMs = 60_000;

  // Se lee en cada llamada (no en el constructor) para no depender del orden de
  // carga de ConfigModule.
  private get webhookUrl(): string | undefined {
    return process.env.DISCORD_WEBHOOK_URL;
  }

  get enabled(): boolean {
    return !!this.webhookUrl;
  }

  async sendError(payload: DiscordErrorPayload): Promise<void> {
    const url = this.webhookUrl;
    if (!url) return; // sin webhook configurado: no-op (útil en local)

    const key = `${payload.context ?? ''}:${payload.title}`;
    const now = Date.now();
    const prev = this.lastSent.get(key);
    if (prev && now - prev < this.dedupeMs) return;
    this.lastSent.set(key, now);

    const fields: DiscordEmbedField[] = [
      { name: 'Env', value: process.env.NODE_ENV ?? 'unknown', inline: true },
    ];
    if (payload.context) {
      fields.push({
        name: 'Context',
        value: truncate(payload.context, MAX_FIELD),
        inline: true,
      });
    }
    fields.push(...(payload.fields ?? []));
    if (payload.stack) {
      fields.push({
        name: 'Stack',
        value: codeBlock(truncate(payload.stack, MAX_FIELD - 12)),
      });
    }

    const embed = {
      title: truncate(`🔴 ${payload.title}`, MAX_TITLE),
      description: payload.description
        ? truncate(payload.description, MAX_DESC)
        : undefined,
      color: DISCORD_RED,
      timestamp: new Date().toISOString(),
      fields: fields.slice(0, 25),
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
      // Best-effort: si Discord limita (429) o responde error, no reintentamos.
      // OJO: se usa console, NO el Logger de Nest, para no reentrar en el
      // DiscordLogger y provocar un bucle.
      if (!res.ok && res.status !== 429) {
        console.error(`[discord] webhook respondió ${res.status}`);
      }
    } catch (err) {
      console.error('[discord] no se pudo enviar el webhook:', err);
    }
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function codeBlock(value: string): string {
  return '```\n' + value + '\n```';
}
