import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { JoinHomeDto } from './dto/join-home.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Home } from './entities/home.entity';
import { nanoid } from 'nanoid';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { RoleService } from '@/role/role.service';
import { RoleName } from '@/role/constants/roles.constants';
import { DataSource } from 'typeorm';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';

@Injectable()
export class HomeService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Home) private homeRepository: Repository<Home>,
    private readonly roleService: RoleService,
    private readonly userHomeRoleService: UserHomeRoleService,
  ) { }

  async create(createHomeDto: CreateHomeDto, user: User) {
    if (!user) throw new NotFoundException('User not found');

    const ownerRole = await this.roleService.findOneBy({ name: RoleName.OWNER });
    if (!ownerRole) throw new InternalServerErrorException('Role configuration missing');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const home = queryRunner.manager.create(Home, {
        ...createHomeDto,
        invitation_code: nanoid(6),
        user_id: user.id,
        points: 0,
      });
      await queryRunner.manager.save(home);

      const userHomeRole = queryRunner.manager.create(UserHomeRole, {
        user_id: user.id,
        home_id: home.id,
        role_id: ownerRole.id,
      });
      await queryRunner.manager.save(userHomeRole);

      await queryRunner.commitTransaction();
      return home;
    } catch (err) {
      await queryRunner.rollbackTransaction(); // deshace TODO si algo falla
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async join(joinHomeDto: JoinHomeDto, user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const home = await this.homeRepository.findOneBy({
      invitation_code: joinHomeDto.invitation_code,
    });

    if (!home) {
      throw new NotFoundException('El código de invitación no es válido');
    }

    // Verificar que el usuario no pertenezca ya a este hogar
    const existing = await this.userHomeRoleService.exists({
      user_id: user.id,
      home_id: home.id,
    });

    if (existing) {
      throw new ConflictException('Ya perteneces a este hogar');
    }

    const memberRole = await this.roleService.findOneBy({ name: RoleName.MEMBER });
    if (!memberRole) {
      throw new InternalServerErrorException('Member role not found');
    }

    await this.userHomeRoleService.assign(user.id, home.id, memberRole.id);

    return home;
  }

  async findAll(user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userHomeRoles = await this.userHomeRoleService.findAll(user.id);
    if (!userHomeRoles || userHomeRoles.length === 0) {
      return [];
    }

    const homeIds = userHomeRoles.map((ur) => ur.home_id);
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

    const userHomeRole = await this.userHomeRoleService.findOne(user.id, homeId);
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    return { home, role: userHomeRole.role };
  }

  async update(id: string, updateHomeDto: UpdateHomeDto, authUser: User) {
    const home = await this.homeRepository.findOneBy({ id });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    const userHomeRole = await this.userHomeRoleService.findOne(authUser.id, id);
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

    const userHomeRole = await this.userHomeRoleService.findOne(authUser.id, id);
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    await this.homeRepository.delete(id);

    return { message: 'Home removed successfully' };
  }

  async findMembers(homeId: string, authUser: User) {
    const home = await this.homeRepository.findOneBy({ id: homeId });
    if (!home) {
      throw new NotFoundException('Home not found');
    }

    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    const userHomeRole = await this.userHomeRoleService.findOne(authUser.id, homeId);
    if (!userHomeRole) {
      throw new BadRequestException('User does not belong to this home');
    }

    const members = await this.userHomeRoleService.findAllByHome(homeId);
    return members.map((m) => ({
      user_id: m.user_id,
      name: m.user.name,
      paternal_surname: m.user.paternal_surname,
      maternal_surname: m.user.maternal_surname,
      role: m.role.name,
    }));
  }
}
