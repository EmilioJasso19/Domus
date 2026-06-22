import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { In, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from '@/users/entities/user.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskOccurrencesService } from '@/task-occurrences/task-occurrences.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly uhrService: UserHomeRoleService,
    private readonly occurrencesService: TaskOccurrencesService,
  ) {}

  // Crear una tarea es crear la PLANTILLA recurrente más su primera ocurrencia
  // (la unidad accionable/asignable). La recurrencia futura es trabajo aparte.
  async create(createTaskDto: CreateTaskDto, user: User) {
    const membership = await this.uhrService.exists({
      user_id: user.id,
      home_id: createTaskDto.home_id,
    });
    if (!membership) {
      throw new BadRequestException('No perteneces a este hogar');
    }

    const { due_date, due_time, responsible_id, ...taskData } = createTaskDto;
    const task = await this.taskRepository.save(
      this.taskRepository.create(taskData),
    );

    await this.occurrencesService.createForTask(
      task.id,
      due_date,
      due_time,
      responsible_id,
    );

    return task;
  }

  async findOne(id: string) {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async findAllByHome(homeId: string) {
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.home_id = :homeId', { homeId })
      .getMany();
  }

  // Lista las PLANTILLAS de tareas del hogar (p.ej. para configurar preferencias).
  // El listado accionable por fecha/estado vive en GET /task-occurrences.
  async findAll(authUser: User, query: QueryTasksDto): Promise<Task[]> {
    const membership = await this.uhrService
      .findOneBy({ user_id: authUser.id, home_id: query.home_id })
      .catch(() => null);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    return this.findAllByHome(query.home_id);
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

  async findManyByIds(ids: string[]) {
    return this.taskRepository.find({
      where: {
        id: In(ids),
      },
    });
  }
}
