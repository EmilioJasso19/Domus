import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVirtualPetDto } from './dto/create-virtual-pet.dto';
import { UpdateVirtualPetDto } from './dto/update-virtual-pet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { VirtualPet } from './entities/virtual-pet.entity';
import { Repository } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

@Injectable()
export class VirtualPetService {
  constructor(
    @InjectRepository(VirtualPet)
    private readonly petRepository: Repository<VirtualPet>,
    private readonly usersService: UsersService,
    private readonly uhrService: UserHomeRoleService,
  ) {}
  async create(createVirtualPetDto: CreateVirtualPetDto, authUser: User) {
    const membership = await this.uhrService.exists({
      user_id: authUser.id,
      home_id: createVirtualPetDto.home_id,
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    const pet = this.petRepository.create(createVirtualPetDto);
    return this.petRepository.save(pet);
  }

  async findOne(id: string, authUser: User) {
    const pet = await this.petRepository.findOneBy({ home_id: id });
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    const membership = await this.uhrService.exists({
      user_id: authUser.id,
      home_id: id,
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    return pet;
  }

  async update(id: string, dto: UpdateVirtualPetDto, authUser: User) {
    const membership = await this.uhrService.exists({
      user_id: authUser.id,
      home_id: id,
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    await this.petRepository.update({ home_id: id }, dto);
    return this.petRepository.findOneBy({ home_id: id });
  }

  async remove(id: string, authUser: User) {
    const membership = await this.uhrService.exists({
      user_id: authUser.id,
      home_id: id,
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    await this.petRepository.delete({ home_id: id });
    return { message: 'Mascota eliminada exitosamente' };
  }
}
