import { Module } from '@nestjs/common';
import { UserHomeRoleService } from './user-home-role.service';
import { UserHomeRoleController } from './user-home-role.controller';
import { UsersModule } from '@/users/users.module';
import { HomeModule } from '@/home/home.module';
import { RoleModule } from '@/role/role.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Role } from '@/role/entities/role.entity';
import { Home } from '@/home/entities/home.entity';
import { UserHomeRole } from './entities/user-home-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Home, UserHomeRole])],
  controllers: [UserHomeRoleController],
  providers: [UserHomeRoleService],
})
export class UserHomeRoleModule {}
