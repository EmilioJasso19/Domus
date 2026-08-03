import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Home } from './entities/home.entity';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { AuthModule } from '@/auth/auth.module';
import { RoleModule } from '@/role/role.module';
import { VirtualPetModule } from '@/virtual-pet/virtual-pet.module';
import { UsersModule } from '@/users/users.module';
import { PushNotificationsModule } from '@/push-notifications/push-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Home]),
    RoleModule,
    UserHomeRoleModule,
    AuthModule,
    VirtualPetModule,
    UsersModule,
    PushNotificationsModule,
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
