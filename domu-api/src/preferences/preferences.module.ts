import { Module } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preference } from './entities/preference.entity';
import { AuthModule } from '@/auth/auth.module';
import { TasksModule } from '@/tasks/tasks.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Preference]),
    AuthModule, 
    TasksModule, 
    UserHomeRoleModule, 
    UsersModule
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
})
export class PreferencesModule {}
