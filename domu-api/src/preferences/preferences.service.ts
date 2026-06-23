import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { User } from '@/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Preference } from './entities/preference.entity';
import { Repository } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { TasksService } from '@/tasks/tasks.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { SavePreferencesDto } from './dto/save-preference-dto';
import { In } from 'typeorm';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(Preference) private preferenceRepository: Repository<Preference>,
    private readonly tasksService: TasksService,
    private readonly uhrService: UserHomeRoleService,
  ) { }
  async save(createPreferenceDto: CreatePreferenceDto, user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { task_id, score } = createPreferenceDto;

    const task = await this.tasksService.findOne(task_id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const uhr = await this.uhrService.exists({ user_id: user.id, home_id: task.home_id });
    if (!uhr) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    const preference = await this.preferenceRepository.findOneBy({ user_id: user.id, task_id });

    if (preference) {
      preference.score = score;
      return this.preferenceRepository.save(preference);
    } else {
      const newPreference = this.preferenceRepository.create({ user_id: user.id, task_id, score });
      return this.preferenceRepository.save(newPreference);
    }
  }

  async remove(id: string, user: User) {
    const preference = await this.preferenceRepository.findOneBy({ user_id: user.id });
    if (!preference) {
      throw new NotFoundException('Preference not found');
    }
    return this.preferenceRepository.remove(preference);
  }

  async removeByUser(userID: string, homeID: string) {
    const preferences = await this.preferenceRepository
      .createQueryBuilder('preference')
      .innerJoin('tasks', 'task', 'preference.task_id = task.id')
      .where('preference.user_id = :userID', { userID })
      .andWhere('task.home_id = :homeID', { homeID })
      .getMany();

    return this.preferenceRepository.remove(preferences);
  }

  async saveMany(dto: SavePreferencesDto, homeId: string, user: User) {
    const belongsToHome =
      await this.uhrService.exists({ user_id: user.id, home_id: homeId });

    if (!belongsToHome) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    const preferences = dto.preferences.map(
      (pref) => ({
        user_id: user.id,
        task_id: pref.task_id,
        score: pref.score,
      }),
    );

    await this.preferenceRepository.upsert(
      preferences,
      ['user_id', 'task_id'],
    );

    return this.preferenceRepository.find({
      where: {
        user_id: user.id,
      },
      relations: {
        task: true,
      },
    });
  }

  async findAllByUserAndHome(userId: string, homeId: string) {
    const belongsToHome = await this.uhrService.exists({
      user_id: userId,
      home_id: homeId,
    });

    if (!belongsToHome) {
      throw new ForbiddenException('No perteneces a este hogar');
    }

    // Siempre devolvemos TODAS las tareas del hogar. La preferencia es opcional:
    // si existe se usa su score almacenado, si no, se devuelve 0 (neutral).
    // No se crean registros en la base de datos durante el GET.
    const tasks = await this.tasksService.findAllByHome(homeId);

    if (tasks.length === 0) {
      return [];
    }

    const preferences = await this.preferenceRepository.find({
      where: {
        user_id: userId,
        task_id: In(tasks.map((task) => task.id)),
      },
    });

    const scoreByTaskId = new Map(
      preferences.map((pref) => [pref.task_id, pref.score]),
    );

    return tasks.map((task) => ({
      user_id: userId,
      task_id: task.id,
      score: scoreByTaskId.get(task.id) ?? 0,
      task: {
        id: task.id,
        name: task.name,
      },
    }));
  }

  async findOneByUserAndTask(userId: string, taskId: string) {
    return this.preferenceRepository.findOneBy({ user_id: userId, task_id: taskId });
  }

}
