import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { In, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entities/user.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly userService: UsersService,
    private readonly uhrService: UserHomeRoleService,
  ) { }
  create(createTaskDto: CreateTaskDto, user: User) {
    const uhr = this.uhrService.findOneBy({ user_id: user.id, home_id: createTaskDto.home_id });
    if (!uhr) {
      throw new BadRequestException('No perteneces a este hogar');
    }

    return this.taskRepository.save(this.taskRepository.create(createTaskDto));
  }

  async findOne(id: string) {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async findAllByUser(userId: string) {
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.responsible_id = :userId', { userId })
      .getMany();
  }

  async findAllByHome(homeId: string) {
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.home_id = :homeId', { homeId })
      .getMany();
  }

  async findAll(authUser: User, query: QueryTasksDto): Promise<Task[]> {
    // El usuario autenticado debe pertenecer al hogar que consulta.
    // findOneBy del UHRService lanza NotFoundException si no existe,
    // así que lo envolvemos para devolver un 403 más apropiado.
    const membership = await this.uhrService
      .findOneBy({ user_id: authUser.id, home_id: query.home_id })
      .catch(() => null);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    // filtrar tarea de acuerdo a los parámetros recibidos
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.home_id = :homeId', { homeId: query.home_id });

    if (query.user_id) {
      qb.andWhere('task.responsible_id = :uid', { uid: query.user_id });
    }

    if (query.completed !== undefined) {
      qb.andWhere('task.is_completed = :completed', {
        completed: query.completed === 'true',
      });
    }

    if (query.date === 'today') {
      const { start, end } = this.getTodayRangeUtc();
      // Por defecto filtra por completed_at; si date_field='due', usa limit_date
      const column = query.date_field === 'due' ? 'task.limit_date' : 'task.completed_at';
      qb.andWhere(`${column} >= :start AND ${column} < :end`, { start, end });
    }

    return qb.getMany();
  }

  // Calcula el rango [inicio, fin) del día actual en la zona del usuario,
  // convertido a UTC para comparar contra columnas timestamptz en Postgres.
  private getTodayRangeUtc(): { start: Date; end: Date } {
    const now = new Date();
    // startOfDay/endOfDay operan sobre la hora local del servidor; para ser
    // correctos respecto a la zona del usuario, calculamos el día y lo
    // convertimos desde esa zona a UTC.
    const startLocal = startOfDay(now);
    const endLocal = endOfDay(now);
    return {
      start: fromZonedTime(startLocal, APP_TIMEZONE),
      end: fromZonedTime(endLocal, APP_TIMEZONE),
    };
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async remove(id: string) {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.taskRepository.softDelete(id);
  }

  // New method to assign a task to a specific user (manually)
  async assignTaskToUser(taskId: string, userId: string) {
    const task = await this.taskRepository.findOneBy({ id: taskId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    task.responsible_id = user.id;
    return this.taskRepository.save(task);
  }

  // TODO: remover este método, será el algoritmo de asignación automática de tareas 
  // basado en preferencias y disponibilidad de los miembros de la casa
  async assignTaskToRandomUser(taskId: string) {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // todo: implement logic for selecting a random user from the same authenticated user's house
      // todo-2: assign task based on house members's preferences
      const users = await this.userService.findAll();
      if (users.length === 0) {
        throw new NotFoundException('No users available to assign the task');
      }

      const randomUser = users[Math.floor(Math.random() * users.length)];
      task.responsible_id = randomUser.id;
      return this.taskRepository.save(task);
    } catch (error: any) {
      throw new BadRequestException('Failed to assign task to a random user', error.message);
    }
  }

  async toggleCompletion(taskId: string, authId: string) {
    const task = await this.taskRepository.findOneBy({ id: taskId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.responsible_id !== authId) {
      throw new BadRequestException('You are not responsible for this task');
    }

    task.is_completed = !task.is_completed;
    // task.completed_at = task.is_completed ? new Date() : null;
    return this.taskRepository.save(task);
  }

  // TODO: implement method to get a brief about task completion 
  // TODO-CONTINUE: for members of the house (percentage/quantity of completed tasks)

  async findManyByIds(ids: string[]) {
    return this.taskRepository.find({
      where: {
        id: In(ids),
      },
    });
  }
}
