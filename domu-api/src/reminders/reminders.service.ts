import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { subHours } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DeviceTokensService } from '@/device-tokens/device-tokens.service';
import { Reminder } from './entities/reminders.entity';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  // Instancia de campo (no const a nivel de módulo) para poder mockearla en tests.
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
    private readonly deviceTokensService: DeviceTokensService,
  ) { }

  async findByOccurrence(occurrenceId: string): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { occurrence: { id: occurrenceId } },
    });
  }

  // Regenera los recordatorios de una ocurrencia (borra y recrea) para que su
  // date_time refleje la due_date/due_time actual:
  //  - con hora: 1h antes y a la hora de vencimiento
  //  - sin hora: 12:00 y 23:00 (APP_TIMEZONE)
  async scheduleForOccurrence(occurrence: TaskOccurrence): Promise<void> {
    await this.reminderRepository
      .createQueryBuilder()
      .delete()
      .where('occurrence_id = :id', { id: occurrence.id })
      .execute();

    const at = (t: string) =>
      fromZonedTime(`${occurrence.due_date}T${t}`, APP_TIMEZONE);
    const times = occurrence.due_time
      ? [subHours(at(occurrence.due_time), 1), at(occurrence.due_time)]
      : [at('12:00:00'), at('23:00:00')];

    await this.reminderRepository.save(
      times.map((date_time) => ({ occurrence, date_time, reminder_sent: false })),
    );
  }

  // Llamado por el cron cada minuto. Envía los recordatorios cuya date_time ya
  // llegó y cuya ocurrencia sigue vigente (asignada, sin completar, tarea viva),
  // marcándolos para no repetir.
  async dispatchDueReminders(): Promise<void> {
    const pending = await this.reminderRepository.find({
      where: {
        reminder_sent: false,
        date_time: LessThanOrEqual(new Date()),
        occurrence: {
          user_id: Not(IsNull()), // con responsable asignado
          completed_at: IsNull(), // sin completar
          task: { deleted_at: IsNull() }, // tarea no eliminada
        },
      },
      relations: { occurrence: { task: true } },
      order: { date_time: 'ASC' },
      take: 100,
    });

    for (const reminder of pending) {
      try {
        await this.sendForOccurrence(reminder);
      } catch (err) {
        this.logger.error(
          `Failed sending reminder for occurrence ${reminder.occurrence.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      // Se marca aunque el envío falle: best-effort, no se reintenta en bucle.
      reminder.reminder_sent = true;
      await this.reminderRepository.save(reminder);
    }
  }

  private async sendForOccurrence(reminder: Reminder): Promise<void> {
    const tokens = await this.deviceTokensService.findByUserId(
      reminder.occurrence.user_id!,
    );
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t.expo_push_token));
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      priority: 'high', // Android: despierta el dispositivo y entrega de inmediato
      channelId: 'reminders', // debe coincidir con el canal registrado en la app
      title: '📋 Tarea por vencer',
      body: `"${reminder.occurrence.task.name}" — Vence ${this.formatDue(reminder)}`,
      data: { occurrence_id: String(reminder.occurrence.id) },
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

  private formatDue(reminder: Reminder): string {
    const target = reminder.occurrence.due_time
      ? fromZonedTime(
        `${reminder.occurrence.due_date}T${reminder.occurrence.due_time}`,
        APP_TIMEZONE,
      )
      : fromZonedTime(`${reminder.occurrence.due_date}T08:00:00`, APP_TIMEZONE);
    return formatInTimeZone(
      target,
      APP_TIMEZONE,
      reminder.occurrence.due_time ? 'd MMM HH:mm' : 'd MMM',
    );
  }
}
