import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}

  async findOne(id: string) {
    const role = await this.roleRepository.findOneBy({ id });
    return role;
  }

  async findOneBy(condition: Partial<Role>) {
    const role = await this.roleRepository.findOneBy(condition);
    return role;
  }
}
