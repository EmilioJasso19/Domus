import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class RemindersCron {
  constructor(private readonly remindersService: RemindersService) {}

  // Cada minuto: delega toda la lógica en el servicio.
  @Cron(CronExpression.EVERY_MINUTE, { timeZone: APP_TIMEZONE })
  async handleReminders(): Promise<void> {
    await this.remindersService.dispatchDueReminders();
  }
}
