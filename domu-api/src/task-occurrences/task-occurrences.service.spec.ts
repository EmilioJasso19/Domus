import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskOccurrencesService } from './task-occurrences.service';
import { TaskOccurrence } from './entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

describe('TaskOccurrencesService', () => {
  let service: TaskOccurrencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskOccurrencesService,
        { provide: getRepositoryToken(TaskOccurrence), useValue: {} },
        { provide: getRepositoryToken(Task), useValue: {} },
        { provide: UserHomeRoleService, useValue: {} },
      ],
    }).compile();

    service = module.get<TaskOccurrencesService>(TaskOccurrencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
