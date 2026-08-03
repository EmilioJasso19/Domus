import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays, addMonths } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { TaskOccurrence } from './entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { User } from '@/users/entities/user.entity';
import { FrequencyType } from '@/tasks/enums/frequency-type.enum';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { CreateTaskOccurrenceDto } from './dto/create-task-occurrence.dto';
import { UpdateTaskOccurrenceDto } from './dto/update-task-occurrence.dto';
import { QueryTaskOccurrencesDto } from './dto/query-task-occurrences.dto';
import { FindOptionsWhere } from 'typeorm';
import { RemindersService } from '@/reminders/reminders.service';
import { HomeService } from '@/home/home.service';
import { PushNotificationsService } from '@/push-notifications/push-notifications.service';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';
const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class TaskOccurrencesService {
  private readonly logger = new Logger(TaskOccurrencesService.name);

  constructor(
    @InjectRepository(TaskOccurrence)
    private readonly occurrenceRepository: Repository<TaskOccurrence>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly homeService: HomeService,
    private readonly uhrService: UserHomeRoleService,
    private readonly remindersService: RemindersService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async create(dto: CreateTaskOccurrenceDto, user: User) {
    const task = await this.taskRepository.findOneBy({ id: dto.task_id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.assertMembership(user.id, task.home_id);

    const occurrence = await this.occurrenceRepository.save(
      this.occurrenceRepository.create({
        task_id: dto.task_id,
        due_date: dto.due_date,
        due_time: dto.due_time ?? null,
      }),
    );
    await this.remindersService.scheduleForOccurrence(occurrence);
    return occurrence;
  }

  // Crea la primera ocurrencia de una tarea recién creada. Lo usa TasksService
  // para que la plantilla nazca con una instancia accionable y asignable.
  // Si se indica responsable, la asignación se delega en setResponsible para
  // que la notificación de "tarea asignada" se dispare en un único punto.
  async createForTask(
    taskId: string,
    dueDate: string,
    dueTime?: string | null,
    responsibleId?: string | null,
  ) {
    const occurrence = await this.occurrenceRepository.save(
      this.occurrenceRepository.create({
        task_id: taskId,
        due_date: dueDate,
        due_time: dueTime ?? null,
      }),
    );

    if (responsibleId) {
      await this.setResponsible(occurrence, responsibleId);
    }

    await this.remindersService.scheduleForOccurrence(occurrence);
    return occurrence;
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

  findBy(
    condition:
      | FindOptionsWhere<TaskOccurrence>
      | FindOptionsWhere<TaskOccurrence>[],
  ) {
    return this.occurrenceRepository.find({
      where: condition,
    });
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

    // Posponer fecha/hora obliga a reprogramar los recordatorios de la ocurrencia.
    let dueChanged = false;
    if (dto.due_date !== undefined) {
      occurrence.due_date = dto.due_date;
      dueChanged = true;
    }
    if (dto.due_time !== undefined) {
      occurrence.due_time = dto.due_time ?? null;
      dueChanged = true;
    }

    const saved = await this.occurrenceRepository.save(occurrence);
    if (dueChanged) {
      await this.remindersService.scheduleForOccurrence(saved);
    }
    return saved;
  }

  async remove(id: string, user: User) {
    const occurrence = await this.findOne(id);
    await this.assertMembership(user.id, occurrence.task.home_id);
    return this.occurrenceRepository.remove(occurrence);
  }

  // Alternar completado. Solo el responsable puede marcar su ocurrencia.
  // Al COMPLETAR (null → fecha) otorga puntos al hogar según qué tan
  // anticipadamente se entregó y genera la siguiente ocurrencia recurrente.
  async toggleCompletion(id: string, authId: string) {
    const occurrence = await this.findOne(id);
    if (occurrence.user_id !== authId) {
      throw new BadRequestException('You are not responsible for this task');
    }

    const completing = !occurrence.completed_at;
    occurrence.completed_at = completing ? new Date() : null;
    const saved = await this.occurrenceRepository.save(occurrence);

    if (completing) {
      await Promise.all([
        this.awardPoints(saved),
        this.generateNextOccurrence(saved),
      ]);
    }

    return saved;
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

  // Veces que el miembro ha sido responsable de ESTA tarea concreta y la completó
  // desde `since`. Usa completed_at (cuándo se hizo el trabajo) para penalizar a
  // quien ya hizo seguido la misma tarea y repartirla de forma más pareja.
  async countAssignmentsSince(
    userId: string,
    taskId: string,
    since: Date,
  ): Promise<number> {
    return this.occurrenceRepository
      .createQueryBuilder('o')
      .where('o.user_id = :userId', { userId })
      .andWhere('o.task_id = :taskId', { taskId })
      .andWhere('o.completed_at IS NOT NULL')
      .andWhere('o.completed_at >= :since', { since })
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

  // Persiste al responsable elegido (o lo limpia con null). Cuando el responsable
  // cambia a un miembro concreto, notifica por push a ese miembro (best-effort).
  async setResponsible(occurrence: TaskOccurrence, userId: string | null) {
    if (userId !== null && userId === occurrence.user_id) {
      return occurrence; // mismo responsable: no-op
    }

    occurrence.user_id = userId;
    const saved = await this.occurrenceRepository.save(occurrence);

    if (userId) {
      await this.notifyAssigned(saved, userId);
    }
    return saved;
  }

  // Avisa por push al miembro asignado a la ocurrencia. Fire-and-forget: nunca
  // rompe la operación de asignación. Carga el nombre de la tarea solo si la
  // ocurrencia no llegó con la relación poblada.
  private async notifyAssigned(
    occurrence: TaskOccurrence,
    userId: string,
  ): Promise<void> {
    try {
      const taskName =
        occurrence.task?.name ??
        (await this.taskRepository.findOneBy({ id: occurrence.task_id }))?.name;
      const due = formatInTimeZone(
        fromZonedTime(`${occurrence.due_date}T08:00:00`, APP_TIMEZONE),
        APP_TIMEZONE,
        'd MMM',
      );

      await this.pushNotificationsService.sendToUser(userId, {
        channelId: 'tasks',
        title: '📋 Tarea asignada',
        body: `Te asignaron: "${taskName ?? 'una tarea'}" · Vence ${due}`,
        data: {
          occurrence_id: occurrence.id,
          task_id: occurrence.task?.id ?? occurrence.task_id,
        },
      });
    } catch (err) {
      this.logger.error(
        `Fallo al notificar asignación de la ocurrencia ${occurrence.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
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

  // Instante objetivo de la ocurrencia en epoch ms: combina due_date con due_time
  // (o el final del día, 23:59:59) interpretados en la zona horaria de la app.
  private toTargetEpochMs(dueDate: string, dueTime?: string | null): number {
    const time = dueTime ?? '23:59:59';
    return fromZonedTime(`${dueDate}T${time}`, APP_TIMEZONE).getTime();
  }

  // Multiplicador de puntos según horas de anticipación respecto al objetivo.
  // Umbrales por frecuencia: ×3 (muy anticipado), ×2 (anticipado), ×1 (a tiempo),
  // ×0.5 (tarde).
  private earlinessMultiplier(hoursEarly: number, freq: FrequencyType): number {
    let max: number;
    let mid: number;
    switch (freq) {
      case FrequencyType.WEEKLY:
        max = 72; // 3 días
        mid = 24; // 1 día
        break;
      case FrequencyType.MONTHLY:
        max = 240; // 10 días
        mid = 72; // 3 días
        break;
      case FrequencyType.ONCE:
      case FrequencyType.DAILY:
      default:
        max = 24;
        mid = 8;
        break;
    }
    if (hoursEarly >= max) return 3;
    if (hoursEarly >= mid) return 2;
    if (hoursEarly >= 0) return 1;
    return 0.5;
  }

  // Suma puntos al hogar por completar la ocurrencia. Base = esfuerzo físico de
  // la tarea, escalado por el multiplicador de anticipación.
  private async awardPoints(occurrence: TaskOccurrence): Promise<void> {
    const targetMs = this.toTargetEpochMs(
      occurrence.due_date,
      occurrence.due_time,
    );
    const hoursEarly = (targetMs - Date.now()) / HOUR_MS;
    const multiplier = this.earlinessMultiplier(
      hoursEarly,
      occurrence.task.frequency_type,
    );
    const base = occurrence.task.physical_effort ?? 1;
    const points = Math.round(base * multiplier);
    if (points <= 0) return;

    await this.homeService.incrementPoints(occurrence.task.home_id, points);
  }

  // Genera la siguiente ocurrencia sin asignar de una tarea recurrente. No hace
  // nada para tareas de una sola vez ni si la siguiente ocurrencia ya existe.
  private async generateNextOccurrence(
    occurrence: TaskOccurrence,
  ): Promise<void> {
    const freq = occurrence.task.frequency_type;
    if (freq === FrequencyType.ONCE) return;

    // Ancla a mediodía UTC para que la aritmética de fechas no cruce de día por
    // desfases de zona horaria o DST al re-formatear.
    const anchor = new Date(`${occurrence.due_date}T12:00:00Z`);
    let next: Date;
    switch (freq) {
      case FrequencyType.DAILY:
        next = addDays(anchor, 1);
        break;
      case FrequencyType.WEEKLY:
        next = addDays(anchor, 7);
        break;
      case FrequencyType.MONTHLY:
        next = addMonths(anchor, 1);
        break;
      default:
        return;
    }
    const nextDueDate = formatInTimeZone(next, 'UTC', 'yyyy-MM-dd');

    const existing = await this.occurrenceRepository.findOne({
      where: { task_id: occurrence.task_id, due_date: nextDueDate },
    });
    if (existing) return;

    const nextOccurrence = this.occurrenceRepository.create({
      task_id: occurrence.task_id,
      due_date: nextDueDate,
      due_time: occurrence.due_time ?? null,
      user_id: null,
    });
    const saved = await this.occurrenceRepository.save(nextOccurrence);
    await this.remindersService.scheduleForOccurrence(saved);
  }
}
