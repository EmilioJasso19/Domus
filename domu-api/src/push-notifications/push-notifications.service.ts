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
    const tokens = (
      await Promise.all(
        userIds.map((id) => this.deviceTokensService.findByUserId(id)),
      )
    ).flat();

    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.expo_push_token));
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((t) => ({
      to: t.expo_push_token,
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

  // Limpia tokens que Expo reporta como ya no registrados en el dispositivo.
  private async handleTickets(
    chunk: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        const to = chunk[i]?.to;
        const token = Array.isArray(to) ? to[0] : to;
        if (token) await this.deviceTokensService.deleteByToken(token);
      }
    }
  }
}
