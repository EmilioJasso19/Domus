import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { AuthModule } from '@/auth/auth.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { BlockedSchedulesModule } from '@/blocked-schedules/blocked-schedules.module';
import { PreferencesModule } from '@/preferences/preferences.module';
import { TaskOccurrencesModule } from '@/task-occurrences/task-occurrences.module';

@Module({
  imports: [
    AuthModule,
    UserHomeRoleModule,
    BlockedSchedulesModule,
    PreferencesModule,
    TaskOccurrencesModule,
  ],
  providers: [AssignmentService],
  controllers: [AssignmentController],
  exports: [AssignmentService],
})
export class AssignmentModule {}
