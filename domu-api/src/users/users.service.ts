import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { UserHomeRole } from '@/user-home-role/entities/user-home-role.entity';
import { Home } from '@/home/entities/home.entity';
import { Task } from '@/tasks/entities/task.entity';
import { DeviceTokens } from '@/device-tokens/entities/device-tokens.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { RoleName } from '@/role/constants/roles.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Usado por AuthService.signUp — no expuesto por HTTP.
  async create(createUserDto: CreateUserDto) {
    const exists = await this.findByEmail(createUserDto.email);
    if (exists) {
      throw new ConflictException('User with this email already exists');
    }

    const hash = await argon2.hash(createUserDto.password);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hash,
    });
    return this.usersRepository.save(user);
  }

  // Usado por JwtStrategy y por HomeService al unirse a un hogar.
  async findOne(id: string) {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'name',
        'paternal_surname',
        'maternal_surname',
      ], // it's necessary to select the password explicitly since entity has select: false
    });
    // NOTE: this method should return null if not found, which is what we want for signIn
    return user;
  }

  async findMe(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password, ...profile } = user;
    return profile;
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'name',
        'paternal_surname',
        'maternal_surname',
        'password',
      ],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { current_password, ...updateData } = updateUserDto;

    if (updateData.password) {
      if (!current_password) {
        throw new BadRequestException(
          'Debes enviar tu contraseña actual para cambiarla',
        );
      }

      const matches = await argon2.verify(user.password, current_password);
      if (!matches) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }

      updateData.password = await argon2.hash(updateData.password);
    }

    await this.usersRepository.update(userId, updateData);
    return this.findMe(userId);
  }

  // Elimina la cuenta del usuario autenticado. En vez de borrar físicamente la
  // fila, la anonimiza: así homes.created_by, task_occurrences.user_id, etc.
  // siguen apuntando a un id válido y no hace falta decidir qué pasa con datos
  // compartidos de otros miembros del hogar.
  async removeMe(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.dataSource.transaction(async (manager) => {
      const memberships = await manager.find(UserHomeRole, {
        where: { user_id: userId },
        relations: ['role'],
      });

      for (const membership of memberships) {
        if (membership.role.name !== RoleName.OWNER) {
          continue;
        }

        const owners = await manager.find(UserHomeRole, {
          where: { home_id: membership.home_id, role_id: membership.role_id },
        });
        if (owners.length > 1) {
          continue;
        }

        const allMembers = await manager.find(UserHomeRole, {
          where: { home_id: membership.home_id },
          order: { joined_at: 'ASC' },
        });
        const successor = allMembers.find((m) => m.user_id !== userId);

        if (!successor) {
          // Único miembro del hogar: se borra el hogar completo.
          await manager.delete(Task, { home_id: membership.home_id });
          await manager.delete(Home, { id: membership.home_id });
          continue;
        }

        successor.role_id = membership.role_id;
        await manager.save(successor);
      }

      await manager.delete(UserHomeRole, { user_id: userId });
      await manager.delete(DeviceTokens, { user_id: userId });
      await manager.delete(RefreshToken, { user_id: userId });

      await manager.update(User, userId, {
        name: 'Usuario',
        paternal_surname: 'eliminado', // paternal_surname es obligatorio, así que ponemos algo genérico
        maternal_surname: '', // no es obligatorio
        email: `deleted-${userId}@domus.invalid`,
        // Aleatoria e irrecuperable: nadie debe poder volver a autenticarse
        // con esta cuenta anonimizada.
        password: await argon2.hash(randomBytes(32).toString('hex')),
      });

      return { message: 'Cuenta eliminada' };
    });
  }
}
