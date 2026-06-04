import { Module } from '@nestjs/common';
import { BlockedSchedulesService } from './blocked-schedules.service';
import { BlockedSchedulesController } from './blocked-schedules.controller';
import { AuthModule } from '@/auth/auth.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { BlockedSchedule } from './entities/blocked-schedule.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([BlockedSchedule]),AuthModule, UserHomeRoleModule],
  controllers: [BlockedSchedulesController],
  providers: [BlockedSchedulesService],
})
export class BlockedSchedulesModule {}
