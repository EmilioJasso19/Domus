import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { subHours } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';
import { DeviceTokensService } from '@/device-tokens/device-tokens.service';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  // Instancia de campo (no const a nivel de módulo) para poder mockearla en tests.
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(TaskOccurrence)
    private readonly occurrenceRepository: Repository<TaskOccurrence>,
    private readonly deviceTokensService: DeviceTokensService,
  ) {}

  // Llamado por el cron cada minuto. Toma las ocurrencias pendientes que aún no
  // han recordado y, para las que ya entraron en su ventana, envía el push y
  // marca reminder_sent para no repetir.
  async dispatchDueReminders(): Promise<void> {
    const occurrences = await this.occurrenceRepository.find({
      where: {
        completed_at: IsNull(),
        reminder_sent: false,
        user_id: Not(IsNull()),
        task: { deleted_at: IsNull() },
      },
      relations: { task: true },
      take: 100,
    });

    for (const occurrence of occurrences) {
      if (!this.shouldRemind(occurrence)) continue;

      try {
        await this.sendForOccurrence(occurrence);
      } catch (err) {
        this.logger.error(
          `Failed sending reminder for occurrence ${occurrence.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      // Se marca aunque el envío falle: el recordatorio es best-effort y no debe
      // reintentarse en bucle cada minuto.
      occurrence.reminder_sent = true;
      await this.occurrenceRepository.save(occurrence);
    }
  }

  // ¿Ya estamos dentro de la ventana de recordatorio?
  private shouldRemind(occurrence: TaskOccurrence): boolean {
    return Date.now() >= this.reminderTarget(occurrence).getTime();
  }

  // Momento a partir del cual se debe recordar, en APP_TIMEZONE:
  //  - con hora: 1h antes del vencimiento
  //  - sin hora: a las 08:00 del día de vencimiento
  private reminderTarget(occurrence: TaskOccurrence): Date {
    if (occurrence.due_time) {
      const due = fromZonedTime(
        `${occurrence.due_date}T${occurrence.due_time}`,
        APP_TIMEZONE,
      );
      return subHours(due, 1);
    }
    return fromZonedTime(`${occurrence.due_date}T08:00:00`, APP_TIMEZONE);
  }

  private async sendForOccurrence(occurrence: TaskOccurrence): Promise<void> {
    const tokens = await this.deviceTokensService.findByUserId(
      occurrence.user_id!,
    );
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.expo_push_token));
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: '📋 Tarea por vencer',
      body: `"${occurrence.task.name}" — Vence ${this.formatDue(occurrence)}`,
      data: { occurrence_id: occurrence.id },
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      await this.handleTickets(chunk, tickets);
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

  private formatDue(occurrence: TaskOccurrence): string {
    const target = occurrence.due_time
      ? fromZonedTime(
          `${occurrence.due_date}T${occurrence.due_time}`,
          APP_TIMEZONE,
        )
      : fromZonedTime(`${occurrence.due_date}T08:00:00`, APP_TIMEZONE);
    return formatInTimeZone(
      target,
      APP_TIMEZONE,
      occurrence.due_time ? 'd MMM HH:mm' : 'd MMM',
    );
  }
}
