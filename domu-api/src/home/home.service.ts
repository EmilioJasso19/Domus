import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';
import { JoinHomeDto } from './dto/join-home.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { Home } from './entities/home.entity';
import { nanoid } from 'nanoid';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { RoleService } from '@/role/role.service';
import { RoleName } from '@/role/constants/roles.constants';
import { DataSource } from 'typeorm';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';
import { Task } from '@/tasks/entities/task.entity';
import { Preference } from '@/preferences/entities/preference.entity';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';

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
        createdBy: user,
        points: 0,
      });
      await queryRunner.manager.save(home);

      const userHomeRole = queryRunner.manager.create(UserHomeRole, {
        user_id: user.id,
        home_id: home.id,
        role_id: ownerRole.id,
      });
      await queryRunner.manager.save(userHomeRole);

      const pet = queryRunner.manager.create('VirtualPet', {
        home_id: home.id,
        name: 'Domi',
        level: 0,
      });
      await queryRunner.manager.save(pet);

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

  // Salir de un hogar. Todo ocurre en una transacción: si algo falla, no se
  // desvincula al usuario a medias. El único OWNER no puede salir (debe transferir
  // el rol antes). Al salir: se borran sus preferencias en este hogar, sus
  // ocurrencias asignadas quedan sin responsable, y se elimina su membresía
  // (lo que cascada sus horarios bloqueados a nivel de BD).
  async leave(homeId: string, user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.dataSource.transaction(async (em) => {
      const membership = await em.findOne(UserHomeRole, {
        where: { user_id: user.id, home_id: homeId },
        relations: ['role'],
      });
      if (!membership) {
        throw new BadRequestException('No perteneces a este hogar');
      }

      // El único OWNER no puede abandonar el hogar sin antes transferir el rol.
      if (membership.role.name === RoleName.OWNER) {
        const ownerCount = await em.count(UserHomeRole, {
          where: { home_id: homeId, role_id: membership.role_id },
        });
        if (ownerCount === 1) {
          throw new ConflictException(
            'Eres el único administrador. Transfiere el rol antes de salir.',
          );
        }
      }

      const tasks = await em.find(Task, {
        where: { home_id: homeId },
        select: ['id'],
      });
      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length) {
        // Borra sus preferencias sobre las tareas de este hogar.
        await em.delete(Preference, {
          user_id: user.id,
          task_id: In(taskIds),
        });
        // Sus ocurrencias asignadas quedan sin responsable (reasignables).
        await em.update(
          TaskOccurrence,
          { user_id: user.id, task_id: In(taskIds) },
          { user_id: null },
        );
      }

      // Elimina la membresía (cascada a blocked_schedules vía FK ON DELETE CASCADE).
      await em.remove(membership);

      return { message: 'Has salido del hogar' };
    });
  }

  async updateMemberRole(
    homeId: string,
    userId: string,
    roleName: string,
    authUser: User,
  ) {
    const home = await this.homeRepository.findOne({
      where: { id: homeId },
      relations: ['createdBy'],
    });
    if (!home) {
      throw new NotFoundException('Hogar no encontrado');
    }

    // Solo el dueño original puede degradarse a sí mismo. Otros administradores
    // sí pueden volver a promoverlo a OWNER (evita el bloqueo si se auto-degrada).
    if (
      home.createdBy.id === userId &&
      authUser.id !== userId &&
      roleName !== RoleName.OWNER
    ) {
      throw new ForbiddenException(
        'Solo el dueño original puede degradarse a sí mismo',
      );
    }

    const role = await this.roleService.findOneBy({ name: roleName });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return this.userHomeRoleService.updateRole(authUser, userId, homeId, role.id);
  }

  // Expulsa a un integrante del hogar. Solo los OWNER pueden hacerlo. No se puede
  // expulsar al creador original ni a uno mismo (para eso está "salir del hogar"),
  // y no se puede dejar al hogar sin administradores. Todo en una transacción:
  // se liberan sus ocurrencias, se borran sus preferencias y se elimina la membresía.
  async expelMember(homeId: string, userId: string, authUser: User) {
    const home = await this.homeRepository.findOne({
      where: { id: homeId },
      relations: ['createdBy'],
    });
    if (!home) {
      throw new NotFoundException('Hogar no encontrado');
    }
    if (!authUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const authMembership = await this.userHomeRoleService.findOne(
      authUser.id,
      homeId,
    );
    if (!authMembership) {
      throw new BadRequestException('No perteneces a este hogar');
    }

    // Solo los OWNER pueden expulsar.
    if (authMembership.role.name !== RoleName.OWNER) {
      throw new ForbiddenException(
        'Solo los administradores pueden expulsar integrantes',
      );
    }

    // No se puede expulsar al creador original.
    if (home.createdBy.id === userId) {
      throw new ForbiddenException('No se puede expulsar al dueño original');
    }

    // No se puede expulsar a uno mismo (debe usar "salir del hogar").
    if (authUser.id === userId) {
      throw new BadRequestException(
        'Usa "salir del hogar" en lugar de expulsarte',
      );
    }

    return this.dataSource.transaction(async (em) => {
      const targetMembership = await em.findOne(UserHomeRole, {
        where: { user_id: userId, home_id: homeId },
        relations: ['role'],
      });
      if (!targetMembership) {
        throw new BadRequestException('El usuario no es miembro de este hogar');
      }

      // Si el objetivo es OWNER, no puede ser el último administrador.
      if (targetMembership.role.name === RoleName.OWNER) {
        const ownerCount = await em.count(UserHomeRole, {
          where: { home_id: homeId, role_id: targetMembership.role_id },
        });
        if (ownerCount === 1) {
          throw new ConflictException(
            'No se puede expulsar al último administrador. Degrádalo primero.',
          );
        }
      }

      const tasks = await em.find(Task, {
        where: { home_id: homeId },
        select: ['id'],
      });
      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length) {
        await em.delete(Preference, {
          user_id: userId,
          task_id: In(taskIds),
        });
        await em.update(
          TaskOccurrence,
          { user_id: userId, task_id: In(taskIds) },
          { user_id: null },
        );
      }

      await em.remove(targetMembership);
      return { message: 'Integrante expulsado del hogar' };
    });
  }

  // Genera un nuevo código de invitación para el hogar. Solo los OWNER pueden
  // hacerlo; invalida el código anterior.
  async regenerateCode(homeId: string, authUser: User) {
    const home = await this.homeRepository.findOne({
      where: { id: homeId },
      relations: ['createdBy'],
    });
    if (!home) {
      throw new NotFoundException('Hogar no encontrado');
    }
    if (!authUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const membership = await this.userHomeRoleService.findOne(
      authUser.id,
      homeId,
    );
    if (!membership) {
      throw new BadRequestException('No perteneces a este hogar');
    }
    if (membership.role.name !== RoleName.OWNER) {
      throw new ForbiddenException(
        'Solo los administradores pueden generar un nuevo código',
      );
    }

    home.invitation_code = nanoid(6);
    await this.homeRepository.save(home);
    return { invitation_code: home.invitation_code };
  }

  async findMembers(homeId: string, authUser: User) {
    const home = await this.homeRepository.findOne({
      where: { id: homeId },
      relations: ['createdBy'],
    });
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
      is_creator: home.createdBy.id === m.user_id,
    }));
  }
}
