import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserHomeRoleDto } from './dto/create-user-home-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Home } from '@/home/entities/home.entity';
import { Repository } from 'typeorm';
import { UserHomeRole } from './entities/user-home-role.entity';
import { Role } from '@/role/entities/role.entity';
import { RoleName } from '@/role/constants/roles.constants';

@Injectable()
export class UserHomeRoleService {
    // This service will handle the logic for assigning roles to users within a 
    // home, as well as managing those roles.
    constructor(
        @InjectRepository(Home) private homeRepository: Repository<Home>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        @InjectRepository(UserHomeRole) private userHomeRoleRepository: Repository<UserHomeRole>
    ) { }

    async create(createUserHomeRoleDto: CreateUserHomeRoleDto) {
        const user = await this.userRepository.findOneBy({ id: createUserHomeRoleDto.user_id });
        const home = await this.homeRepository.findOneBy({ id: createUserHomeRoleDto.home_id });
        const role = await this.roleRepository.findOneBy({ id: createUserHomeRoleDto.role_id });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (!home) {
            throw new NotFoundException('Home not found');
        }

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        const userHomeRole = this.userHomeRoleRepository.create(createUserHomeRoleDto);
        return this.userHomeRoleRepository.save(userHomeRole);
    }

    async assign(userId: string, homeId: string, roleId: string) {
        const uhr = this.userHomeRoleRepository.create({ user_id: userId, home_id: homeId, role_id: roleId });
        return this.userHomeRoleRepository.save(uhr);
    }

    async findAll(userId: string) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.userHomeRoleRepository.find({
            where: { user_id: userId },
            relations: ['home', 'role']
        });
    }

    async findAllByHome(homeId: string) {
        const home = await this.homeRepository.findOneBy({ id: homeId });
        if (!home) {
            throw new NotFoundException('Home not found');
        }

        return this.userHomeRoleRepository.find({
            where: { home_id: homeId },
            relations: ['user', 'role']
        });
    }

    async findOne(userId: string, homeId: string) {
        const userHomeRole = await this.userHomeRoleRepository.findOne({
            where: { user_id: userId, home_id: homeId },
            relations: ['home', 'role']
        });
        if (!userHomeRole) {
            throw new NotFoundException('UserHomeRole not found');
        }
        return userHomeRole;
    }

    async findOneBy(condition: Partial<UserHomeRole>) {
        const userHomeRole = await this.userHomeRoleRepository.findOneBy(condition);
        if (!userHomeRole) {
            throw new NotFoundException('UserHomeRole not found');
        }
        return userHomeRole;
    }

    async exists(condition: Partial<UserHomeRole>) {
        const userHomeRole = await this.userHomeRoleRepository.findOneBy(condition);
        return userHomeRole;
    }

    async remove(userId: string, homeId: string) {
        const userHomeRole = await this.userHomeRoleRepository.findOneBy({ user_id: userId, home_id: homeId });
        if (!userHomeRole) {
            throw new NotFoundException('UserHomeRole not found');
        }

        return this.userHomeRoleRepository.remove(userHomeRole);
    }

    async updateRole(authUser: User, userId: string, homeId: string, roleId: string) {
        // get auth user
        if (!authUser) {
            throw new NotFoundException('User not found');
        }

        // get home
        const home = await this.homeRepository.findOneBy({ id: homeId });
        if (!home) {
            throw new NotFoundException('Home not found');
        }

        // get user home role to update
        const userHomeRole = await this.userHomeRoleRepository.findOneBy({ user_id: userId, home_id: homeId });
        if (!userHomeRole) {
            throw new NotFoundException('UserHomeRole not found');
        }

        // get role to assign
        const role = await this.roleRepository.findOneBy({ id: roleId });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // check if auth user is owner of the home
        const isOwner = await this.userHomeRoleRepository.findOne({
            where: { user_id: authUser.id, home_id: homeId, role: { name: RoleName.OWNER } },
            relations: ['role'],
        });
        if (!isOwner) {
            throw new ForbiddenException('Solo los administradores pueden cambiar roles');
        }

        // update role only if auth user is house's owner
        userHomeRole.role = role;
        return this.userHomeRoleRepository.save(userHomeRole);
    }
}
