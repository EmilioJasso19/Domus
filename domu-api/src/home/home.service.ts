import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Home } from './entities/home.entity';
import { Roles } from 'src/users/enums/roles.enums';
import { response } from 'express';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Home) private homeRepository: Repository<Home>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}
  
  async create(createHomeDto: CreateHomeDto, userId: string) {
    // todo: make a helper function to find auth user and assign to home
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Roles.GUEST) {
      throw new BadRequestException('User already belongs to a home');
    }

    const home = this.homeRepository.create(createHomeDto);
    await this.homeRepository.save(home);
    
    user.home_id = home.id;
    user.role = Roles.OWNER;
    await this.userRepository.save(user);
    
    return home;
  }

  // findAll() {
  //   return `This action returns all home`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} home`;
  // }

  async update(id: string, updateHomeDto: UpdateHomeDto) {
    const home = await this.homeRepository.findOneBy({ id });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    await this.homeRepository.update(id, updateHomeDto);

    return response.status(200).json({ message: 'Home updated successfully' });
  }

  async remove(id: string) {
    const home = await this.homeRepository.findOneBy({ id });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    await this.homeRepository.delete(id);

    return response.status(200).json({ message: 'Home removed successfully' });
  }
}
