import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushNotificationsModule } from '@/push-notifications/push-notifications.module';
import { RemindersService } from './reminders.service';
import { RemindersCron } from './reminders.cron';
import { Reminder } from './entities/reminders.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder]), PushNotificationsModule],
  providers: [RemindersService, RemindersCron],
  exports: [RemindersService],
})
export class RemindersModule {}
