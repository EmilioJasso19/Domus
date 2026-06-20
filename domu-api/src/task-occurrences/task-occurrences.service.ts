import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { TaskOccurrence } from './entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { User } from '@/users/entities/user.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { CreateTaskOccurrenceDto } from './dto/create-task-occurrence.dto';
import { UpdateTaskOccurrenceDto } from './dto/update-task-occurrence.dto';
import { QueryTaskOccurrencesDto } from './dto/query-task-occurrences.dto';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class TaskOccurrencesService {
  constructor(
    @InjectRepository(TaskOccurrence)
    private readonly occurrenceRepository: Repository<TaskOccurrence>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly uhrService: UserHomeRoleService,
  ) {}

  async create(dto: CreateTaskOccurrenceDto, user: User) {
    const task = await this.taskRepository.findOneBy({ id: dto.task_id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.assertMembership(user.id, task.home_id);

    const occurrence = this.occurrenceRepository.create({
      task_id: dto.task_id,
      due_date: dto.due_date,
      due_time: dto.due_time ?? null,
    });
    return this.occurrenceRepository.save(occurrence);
  }

  // Crea la primera ocurrencia de una tarea recién creada. Lo usa TasksService
  // para que la plantilla nazca con una instancia accionable y asignable.
  async createForTask(taskId: string, dueDate: string, dueTime?: string | null) {
    const occurrence = this.occurrenceRepository.create({
      task_id: taskId,
      due_date: dueDate,
      due_time: dueTime ?? null,
    });
    return this.occurrenceRepository.save(occurrence);
  }

  // Lista las ocurrencias accionables de un hogar. Reemplaza el viejo GET /tasks
  // filtrado por fecha/estado, que operaba sobre la tabla tasks.
  async findAllByHome(query: QueryTaskOccurrencesDto, authUser: User) {
    await this.assertMembership(authUser.id, query.home_id);

    const qb = this.occurrenceRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.task', 'task')
      .where('task.home_id = :homeId', { homeId: query.home_id })
      .andWhere('task.deleted_at IS NULL');

    if (query.user_id) {
      qb.andWhere('o.user_id = :uid', { uid: query.user_id });
    }

    if (query.completed !== undefined) {
      qb.andWhere(
        query.completed === 'true'
          ? 'o.completed_at IS NOT NULL'
          : 'o.completed_at IS NULL',
      );
    }

    if (query.date === 'today') {
      qb.andWhere('o.due_date = :today', { today: this.todayInAppTz() });
    }

    return qb.orderBy('o.due_date', 'ASC').addOrderBy('o.id', 'ASC').getMany();
  }

  async findOne(id: string) {
    const occurrence = await this.occurrenceRepository.findOne({
      where: { id },
      relations: { task: true },
    });
    if (!occurrence) {
      throw new NotFoundException('Task occurrence not found');
    }
    return occurrence;
  }

  async update(id: string, dto: UpdateTaskOccurrenceDto, user: User) {
    const occurrence = await this.findOne(id);
    await this.assertMembership(user.id, occurrence.task.home_id);

    if (dto.due_date !== undefined) occurrence.due_date = dto.due_date;
    if (dto.due_time !== undefined) occurrence.due_time = dto.due_time ?? null;

    return this.occurrenceRepository.save(occurrence);
  }

  async remove(id: string, user: User) {
    const occurrence = await this.findOne(id);
    await this.assertMembership(user.id, occurrence.task.home_id);
    return this.occurrenceRepository.remove(occurrence);
  }

  // Alternar completado. Solo el responsable puede marcar su ocurrencia.
  async toggleCompletion(id: string, authId: string) {
    const occurrence = await this.findOne(id);
    if (occurrence.user_id !== authId) {
      throw new BadRequestException('You are not responsible for this task');
    }
    occurrence.completed_at = occurrence.completed_at ? null : new Date();
    return this.occurrenceRepository.save(occurrence);
  }

  // Asignación manual de un responsable (el algoritmo automático vive en AssignmentService).
  async assignToUser(id: string, userId: string, authUser: User) {
    const occurrence = await this.findOne(id);
    await this.assertMembership(authUser.id, occurrence.task.home_id);

    const target = await this.uhrService.exists({
      user_id: userId,
      home_id: occurrence.task.home_id,
    });
    if (!target) {
      throw new BadRequestException('El usuario no pertenece a este hogar');
    }

    return this.setResponsible(occurrence, userId);
  }

  // ===== Soporte para la capa de asignación automática =====

  // Σ esfuerzo físico de las ocurrencias ACTIVAS (sin completar, tarea no borrada)
  // del miembro dentro del hogar. Es la "carga actual" del snapshot.
  async sumActiveEffort(userId: string, homeId: string): Promise<number> {
    const raw = await this.occurrenceRepository
      .createQueryBuilder('o')
      .innerJoin('o.task', 'task')
      .select('COALESCE(SUM(task.physical_effort), 0)', 'sum')
      .where('o.user_id = :userId', { userId })
      .andWhere('task.home_id = :homeId', { homeId })
      .andWhere('o.completed_at IS NULL')
      .andWhere('task.deleted_at IS NULL')
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  // Completadas por el miembro en el hogar desde `since` (ventana de la frecuencia).
  async countCompletionsSince(
    userId: string,
    homeId: string,
    since: Date,
  ): Promise<number> {
    return this.occurrenceRepository
      .createQueryBuilder('o')
      .innerJoin('o.task', 'task')
      .where('o.user_id = :userId', { userId })
      .andWhere('task.home_id = :homeId', { homeId })
      .andWhere('o.completed_at IS NOT NULL')
      .andWhere('o.completed_at >= :since', { since })
      .andWhere('task.deleted_at IS NULL')
      .getCount();
  }

  // Ocurrencias sin asignar de un hogar, en orden determinístico (due_date, id).
  async findUnassignedByHome(homeId: string): Promise<TaskOccurrence[]> {
    return this.occurrenceRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.task', 'task')
      .where('task.home_id = :homeId', { homeId })
      .andWhere('o.user_id IS NULL')
      .andWhere('o.completed_at IS NULL')
      .andWhere('task.deleted_at IS NULL')
      .orderBy('o.due_date', 'ASC')
      .addOrderBy('o.id', 'ASC')
      .getMany();
  }

  // Persiste al responsable elegido (o lo limpia con null).
  async setResponsible(occurrence: TaskOccurrence, userId: string | null) {
    occurrence.user_id = userId;
    return this.occurrenceRepository.save(occurrence);
  }

  // ===== Helpers privados =====
  private async assertMembership(userId: string, homeId: string) {
    const membership = await this.uhrService.exists({
      user_id: userId,
      home_id: homeId,
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }
    return membership;
  }

  private todayInAppTz(): string {
    return formatInTimeZone(new Date(), APP_TIMEZONE, 'yyyy-MM-dd');
  }
}
