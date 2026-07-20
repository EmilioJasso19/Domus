import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceTokensModule } from '@/device-tokens/device-tokens.module';
import { RemindersService } from './reminders.service';
import { RemindersCron } from './reminders.cron';
import { Reminder } from './entities/reminders.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder]),
    DeviceTokensModule,
  ],
  providers: [RemindersService, RemindersCron],
  exports: [RemindersService],
})
export class RemindersModule {}
