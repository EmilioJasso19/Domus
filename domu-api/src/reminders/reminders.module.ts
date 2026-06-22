import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { DeviceTokensModule } from '@/device-tokens/device-tokens.module';
import { RemindersService } from './reminders.service';
import { RemindersCron } from './reminders.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskOccurrence, Task]),
    DeviceTokensModule,
  ],
  providers: [RemindersService, RemindersCron],
})
export class RemindersModule {}
