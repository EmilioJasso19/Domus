import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { UsersModule } from '@/users/users.module';
import { HomeModule } from '@/home/home.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), UsersModule, HomeModule, UserHomeRoleModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
