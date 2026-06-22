import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskOccurrencesService } from './task-occurrences.service';
import { TaskOccurrencesController } from './task-occurrences.controller';
import { TaskOccurrence } from './entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { Home } from '@/home/entities/home.entity';
import { AuthModule } from '@/auth/auth.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskOccurrence, Task, Home]),
    AuthModule,
    UserHomeRoleModule,
  ],
  providers: [TaskOccurrencesService],
  controllers: [TaskOccurrencesController],
  exports: [TaskOccurrencesService],
})
export class TaskOccurrencesModule {}
