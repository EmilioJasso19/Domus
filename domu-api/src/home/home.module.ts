import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Home } from './entities/home.entity';
import { User } from '@/users/entities/user.entity';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { AuthModule } from '@/auth/auth.module';
import { RoleModule } from '@/role/role.module';
import { Role } from '@/role/entities/role.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Home, User, Role, UserHomeRole]), AuthModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
