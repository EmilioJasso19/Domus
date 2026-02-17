import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Home } from './entities/home.entity';
import { response } from 'express';
import { Role } from '@/role/entities/role.entity';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Home) private homeRepository: Repository<Home>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(UserHomeRole) private userHomeRoleRepository: Repository<UserHomeRole>
  ) {}
  
  async create(createHomeDto: CreateHomeDto, user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const home = this.homeRepository.create(createHomeDto);
    await this.homeRepository.save(home);
    const ownerRole = await this.roleRepository.findOneBy({ name: 'OWNER' });
    if (!ownerRole) {
      throw new NotFoundException('Owner role not found');
    }

    const userHomeRole = this.userHomeRoleRepository.create({
      user_id: user.id,
      home_id: home.id,
      role_id: ownerRole.id
    })

    await this.userHomeRoleRepository.save(userHomeRole);
    
    return home;
  }

  async findAll(user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userHomeRoles = await this.userHomeRoleRepository.findBy({ user_id: user.id });
    if (!userHomeRoles || userHomeRoles.length === 0) {
      return [];
    }

    const homeIds = userHomeRoles.map(ur => ur.home_id);
    const homes = await this.homeRepository.findByIds(homeIds);

    return homes;
  }

  async findOne(homeId: string, user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const home = await this.homeRepository.findOneBy({ id: homeId });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    const userHomeRole = await this.userHomeRoleRepository.findOneBy({ user_id: user.id, home_id: homeId });
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    return {home, role: userHomeRole.role};
  }

  async update(id: string, updateHomeDto: UpdateHomeDto, authUser: User) {
    // get home
    const home = await this.homeRepository.findOneBy({ id });
    if (!home) {
      throw new NotFoundException('Home not found');
    }
    // get user
    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    // check if auth user belongs to the home
    const userHomeRole = await this.userHomeRoleRepository.findOneBy({ user_id: authUser.id, home_id: id });
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    return this.homeRepository.update(id, updateHomeDto);
  }

  async remove(id: string, authUser: User) {
    const home = await this.homeRepository.findOneBy({ id });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    const userHomeRole = await this.userHomeRoleRepository.findOneBy({ user_id: authUser.id, home_id: id });
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    await this.homeRepository.delete(id);

    return response.status(200).json({ message: 'Home removed successfully' });
  }
}
