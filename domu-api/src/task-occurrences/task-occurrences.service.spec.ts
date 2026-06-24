import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { TaskOccurrencesService } from './task-occurrences.service';
import { TaskOccurrence } from './entities/task-occurrence.entity';
import { Task } from '@/tasks/entities/task.entity';
import { Home } from '@/home/entities/home.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

const buildOccurrence = (over: any = {}) => ({
  id: 'o1',
  user_id: '1',
  completed_at: null,
  task: { id: 't1', home_id: 'h1', physical_effort: 2 },
  ...over,
});

const mockOccurrenceRepository: any = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockTaskRepository: any = {};
const mockHomeRepository: any = {};
const mockUhrService: any = { exists: jest.fn() };

describe('TaskOccurrencesService', () => {
  let service: TaskOccurrencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskOccurrencesService,
        { provide: getRepositoryToken(TaskOccurrence), useValue: mockOccurrenceRepository },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(Home), useValue: mockHomeRepository },
        { provide: UserHomeRoleService, useValue: mockUhrService },
      ],
    }).compile();

    service = module.get<TaskOccurrencesService>(TaskOccurrencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // C24 — Completar tarea: marca completed_at, otorga puntos y genera la siguiente.
  describe('C24 - Completar tarea', () => {
    it('marca completed_at, otorga puntos y genera la siguiente ocurrencia', async () => {
      const occ = buildOccurrence({ completed_at: null });
      mockOccurrenceRepository.findOne.mockResolvedValue(occ);
      mockOccurrenceRepository.save.mockImplementation(async (o: any) => o);
      const award = jest
        .spyOn(service as any, 'awardPoints')
        .mockResolvedValue(undefined);
      const next = jest
        .spyOn(service as any, 'generateNextOccurrence')
        .mockResolvedValue(undefined);

      const result = await service.toggleCompletion('o1', '1');

      expect(result.completed_at).toBeInstanceOf(Date);
      expect(mockOccurrenceRepository.save).toHaveBeenCalled();
      expect(award).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('al desmarcar (toggle inverso) NO otorga puntos ni genera ocurrencia', async () => {
      const occ = buildOccurrence({ completed_at: new Date() });
      mockOccurrenceRepository.findOne.mockResolvedValue(occ);
      mockOccurrenceRepository.save.mockImplementation(async (o: any) => o);
      const award = jest
        .spyOn(service as any, 'awardPoints')
        .mockResolvedValue(undefined);
      const next = jest
        .spyOn(service as any, 'generateNextOccurrence')
        .mockResolvedValue(undefined);

      const result = await service.toggleCompletion('o1', '1');

      expect(result.completed_at).toBeNull();
      expect(award).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  // C25 — Completar una tarea de la que no se es responsable.
  // NOTA: la implementación lanza BadRequestException (400). El caso documentado
  // habla de "forbidden"; ver discrepancia 400-vs-403 reportada.
  describe('C25 - Completar tarea no asignada', () => {
    it('rechaza cuando el usuario no es el responsable de la ocurrencia', async () => {
      const occ = buildOccurrence({ user_id: '2' }); // responsable distinto
      mockOccurrenceRepository.findOne.mockResolvedValue(occ);

      await expect(service.toggleCompletion('o1', '1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockOccurrenceRepository.save).not.toHaveBeenCalled();
    });
  });

  // C48 — La carga (sumActiveEffort) solo cuenta ocurrencias activas: sin
  // completar y de tareas no borradas.
  describe('C48 - La carga cuenta solo ocurrencias activas', () => {
    it('filtra por completed_at IS NULL y task.deleted_at IS NULL', async () => {
      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '7' }),
      };
      mockOccurrenceRepository.createQueryBuilder.mockReturnValue(qb);

      const total = await service.sumActiveEffort('1', 'h1');

      expect(total).toBe(7);
      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(clauses).toContain('o.completed_at IS NULL');
      expect(clauses).toContain('task.deleted_at IS NULL');
    });
  });
});
