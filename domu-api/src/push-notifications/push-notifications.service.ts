import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DeviceTokensService } from '@/device-tokens/device-tokens.service';

export interface PushPayload {
  title: string;
  body: string;
  /** Canal Android que debe coincidir con uno registrado en la app. */
  channelId: string;
  data?: Record<string, string>;
}

/**
 * Capa única de envío de notificaciones push por Expo. Centraliza la consulta de
 * tokens, el filtrado de tokens válidos, el chunking y la limpieza de tokens que
 * Expo reporta como ya no registrados (DeviceNotRegistered).
 *
 * El envío es best-effort: nunca lanza, registra errores por Logger y sigue.
 * Así las llamadas fire-and-forget del resto del sistema pueden desentenderse.
 */
@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  // Instancia de campo (no const a nivel de módulo) para poder mockearla en tests.
  private readonly expo = new Expo();

  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    return this.sendToUsers([userId], payload);
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    // Una sola consulta para todos los destinatarios en lugar de una por usuario.
    const tokens = await this.deviceTokensService.findByUserIds([
      ...new Set(userIds),
    ]);

    // Set: un mismo dispositivo nunca debe recibir el aviso dos veces.
    const valid = [
      ...new Set(
        tokens
          .map((t) => t.expo_push_token)
          .filter((token) => Expo.isExpoPushToken(token)),
      ),
    ];
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((token) => ({
      to: token,
      sound: 'default',
      priority: 'high', // Android: despierta el dispositivo y entrega de inmediato
      channelId: payload.channelId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(chunk, tickets);
      } catch (err) {
        this.logger.error(
          'Fallo al enviar notificación push',
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  /**
   * Procesa los tickets de un chunk. Expo los devuelve en el mismo orden que los
   * mensajes enviados, así que el índice basta para recuperar el token.
   *
   * - status 'ok': Expo aceptó el mensaje para entrega -> sella last_success_at.
   * - DeviceNotRegistered: la app ya no está instalada -> se borra el registro.
   *
   * Ojo: un ticket 'ok' no garantiza la entrega final, solo la aceptación. Los
   * errores definitivos llegan más tarde vía la API de receipts, que todavía no
   * consultamos; por eso la limpieza por tickets es parcial y la completa el
   * cron de dispositivos obsoletos.
   */
  private async handleTickets(
    chunk: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    const accepted: string[] = [];
    const unregistered: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const to = chunk[i]?.to;
      const token = Array.isArray(to) ? to[0] : to;
      if (!token) continue;

      if (ticket.status === 'ok') {
        accepted.push(token);
      } else if (ticket.details?.error === 'DeviceNotRegistered') {
        unregistered.push(token);
      } else {
        this.logger.warn(
          `Expo rechazó el envío al token ${token}: ${ticket.message}`,
        );
      }
    }

    await this.deviceTokensService.markSuccess(accepted);
    for (const token of unregistered) {
      await this.deviceTokensService.deleteByToken(token);
    }
  }
}
