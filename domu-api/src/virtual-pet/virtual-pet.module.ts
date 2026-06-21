import { Module } from '@nestjs/common';
import { VirtualPetService } from './virtual-pet.service';
import { VirtualPetController } from './virtual-pet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualPet } from './entities/virtual-pet.entity';
import { UsersModule } from '@/users/users.module';
import { UserHomeRoleModule } from '@/user-home-role/user-home-role.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualPet]),
    UsersModule, 
    UserHomeRoleModule,
    AuthModule,
  ],
  controllers: [VirtualPetController],
  providers: [VirtualPetService],
  exports: [VirtualPetService]
})
export class VirtualPetModule { }
