import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PreferencesService } from './preferences.service';
import { Preference } from './entities/preference.entity';
import { TasksService } from '@/tasks/tasks.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

// ===== Mocks =====

// QueryBuilder encadenable para removeByUser
const mockQueryBuilder = {
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
};

const mockPreferenceRepository = {
  upsert: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

const mockTasksService = {
  findAllByHome: jest.fn(),
};

const mockUhrService = {
  exists: jest.fn(),
};

const mockUser: any = { id: '1', name: 'Emilio' };

describe('PreferencesService', () => {
  let service: PreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: getRepositoryToken(Preference), useValue: mockPreferenceRepository },
        { provide: TasksService, useValue: mockTasksService },
        { provide: UserHomeRoleService, useValue: mockUhrService },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== CP-53: Guardado en lote exitoso (upsert) =====
  describe('saveMany() – guardado en lote', () => {
    it('CP-53: debe hacer upsert de las preferencias con el user_id del autenticado', async () => {
      mockUhrService.exists.mockResolvedValue(true);
      mockPreferenceRepository.upsert.mockResolvedValue(undefined);
      mockPreferenceRepository.find.mockResolvedValue([
        { user_id: '1', task_id: '10', score: 1 },
      ]);

      const dto = { preferences: [{ task_id: '10', score: 1 }] } as any;
      const result = await service.saveMany(dto, '100', mockUser);

      expect(mockPreferenceRepository.upsert).toHaveBeenCalledWith(
        [{ user_id: '1', task_id: '10', score: 1 }],
        ['user_id', 'task_id'],
      );
      expect(result).toEqual([{ user_id: '1', task_id: '10', score: 1 }]);
    });
  });

  // ===== CP-54: Mezcla crear + actualizar en el mismo lote =====
  describe('saveMany() – lote con varias preferencias', () => {
    it('CP-54: debe enviar todas las preferencias del lote a upsert (crea y actualiza en una sola operación)', async () => {
      mockUhrService.exists.mockResolvedValue(true);
      mockPreferenceRepository.upsert.mockResolvedValue(undefined);
      mockPreferenceRepository.find.mockResolvedValue([]);

      const dto = {
        preferences: [
          { task_id: '10', score: 1 },
          { task_id: '11', score: -1 },
        ],
      } as any;

      await service.saveMany(dto, '100', mockUser);

      // El upsert resuelve crear vs actualizar a nivel BD; el service solo mapea
      expect(mockPreferenceRepository.upsert).toHaveBeenCalledWith(
        [
          { user_id: '1', task_id: '10', score: 1 },
          { user_id: '1', task_id: '11', score: -1 },
        ],
        ['user_id', 'task_id'],
      );
    });
  });

  // ===== CP-56: Ownership – no pertenece al hogar =====
  describe('saveMany() – usuario fuera del hogar', () => {
    it('CP-56: debe lanzar ForbiddenException y NO hacer upsert si el usuario no pertenece al hogar', async () => {
      mockUhrService.exists.mockResolvedValue(false);

      const dto = { preferences: [{ task_id: '10', score: 1 }] } as any;

      await expect(service.saveMany(dto, '999', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPreferenceRepository.upsert).not.toHaveBeenCalled();
    });
  });

  // ===== CP-57: GET devuelve neutral (0) cuando no hay preferencia, sin escribir =====
  describe('findAllByUserAndHome() – fallback a neutral', () => {
    it('CP-57: debe devolver score 0 para tareas sin preferencia y NO crear filas', async () => {
      mockUhrService.exists.mockResolvedValue(true);
      mockTasksService.findAllByHome.mockResolvedValue([
        { id: '10', name: 'Barrer sala' },
        { id: '11', name: 'Lavar platos' },
      ]);
      // Solo existe preferencia para la tarea 10; la 11 no tiene
      mockPreferenceRepository.find.mockResolvedValue([
        { user_id: '1', task_id: '10', score: 1 },
      ]);

      const result = await service.findAllByUserAndHome('1', '100');

      expect(result).toEqual([
        { user_id: '1', task_id: '10', score: 1, task: { id: '10', name: 'Barrer sala' } },
        { user_id: '1', task_id: '11', score: 0, task: { id: '11', name: 'Lavar platos' } },
      ]);
      // Un GET no debe escribir: ni upsert ni remove
      expect(mockPreferenceRepository.upsert).not.toHaveBeenCalled();
      expect(mockPreferenceRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ===== CP-58: POST no elimina registro al actualizar a neutral =====
  it('CP-58: debe guardar score 0 y no eliminar el registro', async () => {
    mockUhrService.exists.mockResolvedValue(true);
    mockPreferenceRepository.upsert.mockResolvedValue(undefined);

    mockPreferenceRepository.find.mockResolvedValue([
      { user_id: '1', task_id: '10', score: 0 },
    ]);

    await service.saveMany(
      { preferences: [{ task_id: '10', score: 0 }] } as any,
      '100',
      mockUser,
    );

    expect(mockPreferenceRepository.upsert).toHaveBeenCalledWith(
      [{ user_id: '1', task_id: '10', score: 0 }],
      ['user_id', 'task_id'],
    );

    expect(mockPreferenceRepository.remove).not.toHaveBeenCalled();
  });

  // ===== CP-59: Cascada al salir de la casa =====
  describe('removeByUser() – cascada al salir del hogar', () => {
    it('CP-59: debe borrar las preferencias del usuario asociadas a tareas de esa casa', async () => {
      const toDelete = [
        { user_id: '1', task_id: '10', score: 1 },
        { user_id: '1', task_id: '11', score: -1 },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(toDelete);
      mockPreferenceRepository.remove.mockResolvedValue(toDelete);

      await service.removeByUser('1', '100');

      // Filtra por user_id Y home_id de la tarea (no borra de otras casas)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'preference.user_id = :userID',
        { userID: '1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.home_id = :homeID',
        { homeID: '100' },
      );
      expect(mockPreferenceRepository.remove).toHaveBeenCalledWith(toDelete);
    });
  });
});