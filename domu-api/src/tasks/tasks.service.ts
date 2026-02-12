import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }
  create(createTaskDto: CreateTaskDto) {
    return this.taskRepository.save(this.taskRepository.create(createTaskDto));
  }

  findAll() {
    return this.taskRepository.find();
  }

  async findOne(id: string) {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async findAllByUser(userId: string) {
    const task = await this.taskRepository.findOneBy({ responsible_id: userId });
    if (!task) {
      throw new NotFoundException('Task not found for this user');
    }
    return task;
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

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    task.responsible_id = user.id;
    return this.taskRepository.save(task);
  }

  // New method to assign a task to a random user (automatically)
  async assignTaskToRandomUser(taskId: string) {
    try {
      const task = await this.taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // todo: implement logic for selecting a random user from the same authenticated user's house
      // todo-2: assign task based on house members's preferences
      const users = await this.userRepository.find();
      if (users.length === 0) {
        throw new NotFoundException('No users available to assign the task');
      }

      const randomUser = users[Math.floor(Math.random() * users.length)];
      task.responsible_id = randomUser.id;
      return this.taskRepository.save(task);
    } catch (error) {
      throw new BadRequestException('Failed to assign task to a random user', error.message);
    }
  }

  async markAsCompleted(taskId: string, authId: string) {
    const task = await this.taskRepository.findOneBy({ id: taskId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.responsible_id !== authId) {
      throw new BadRequestException('You are not responsible for this task');
    }

    task.is_completed = true;
    return this.taskRepository.save(task);
  }

  // TODO: implement method to get a brief about task completion 
  // TODO-CONTINUE: for members of the house (percentage/quantity of completed tasks)
}
