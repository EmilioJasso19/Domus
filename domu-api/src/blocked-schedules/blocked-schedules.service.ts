import { ConflictException, ForbiddenException, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateBlockedScheduleDto } from './dto/create-blocked-schedule.dto';
import { UpdateBlockedScheduleDto } from './dto/update-blocked-schedule.dto';
import { User } from '@/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockedSchedule } from './entities/blocked-schedule.entity';
import { Repository } from 'typeorm';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

@Injectable()
export class BlockedSchedulesService {
  constructor(
    @InjectRepository(BlockedSchedule) private blockedScheduleRepository: Repository<BlockedSchedule>,
    private readonly userHomeRoleService: UserHomeRoleService,
  ) { }
  async create(dto: CreateBlockedScheduleDto, user: User) {
    await this.validateMembership(user.id, dto.home_id);

    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException(
        'La hora inicial debe ser menor a la final',
      );
    }

    if (
      dto.start_date &&
      dto.end_date &&
      dto.start_date > dto.end_date
    ) {
      throw new BadRequestException(
        'La fecha inicial debe ser menor a la final',
      );
    }

    const duplicate =
      await this.blockedScheduleRepository.findOne({
        where: {
          home_id: dto.home_id,
          user_id: user.id,
          day: dto.day,
          start_time: dto.start_time,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'Ya existe un horario bloqueado',
      );
    }

    const schedule =
      this.blockedScheduleRepository.create({
        ...dto,
        user_id: user.id,
      });

    return this.blockedScheduleRepository.save(
      schedule,
    );
  }

  findAll(user: User, homeId?: string) {
    return this.blockedScheduleRepository.find({
      where: { user_id: user.id, ...(homeId ? { home_id: homeId } : {}) },
    });
  }

  async findOne(id: string, user: User) {
    const schedule = await this.blockedScheduleRepository.findOne({
      where: { id, user_id: user.id },
    });
    if (!schedule) throw new NotFoundException();
    return schedule;
  }

  async update(id: string, dto: UpdateBlockedScheduleDto, user: User) {
    const schedule = await this.blockedScheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException();
    if (schedule.user_id !== user.id) throw new ForbiddenException();

    // Validar contra los valores resultantes (mezcla lo nuevo con lo existente)
    const start = dto.start_time ?? schedule.start_time;
    const end = dto.end_time ?? schedule.end_time;
    if (start && end && start >= end) {
      throw new BadRequestException('La hora inicial debe ser menor a la final');
    }

    return this.blockedScheduleRepository.save({ ...schedule, ...dto });
  }

  async remove(id: string, user: User) {
    const schedule =
      await this.blockedScheduleRepository.findOne({
        where: { id },
      });

    if (!schedule) {
      throw new NotFoundException();
    }

    if (schedule.user_id !== user.id) {
      throw new ForbiddenException();
    }

    await this.blockedScheduleRepository.remove(
      schedule,
    );
  }

  // ===== HELPERS PRIVADOS =====
  private async validateMembership(userId: string, homeId: string) {
    const membership =
      await this.userHomeRoleService.exists({
        user_id: userId,
        home_id: homeId,
      });

    if (!membership) {
      throw new ForbiddenException(
        'No perteneces a este hogar',
      );
    }

    return membership;
  }
}
