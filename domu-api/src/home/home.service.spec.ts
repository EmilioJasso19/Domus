import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HomeService } from './home.service';
import { Home } from './entities/home.entity';
import { RoleService } from '@/role/role.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { RoleName } from '@/role/constants/roles.constants';
import { Task } from '@/tasks/entities/task.entity';
import { Preference } from '@/preferences/entities/preference.entity';
import { TaskOccurrence } from '@/task-occurrences/entities/task-occurrence.entity';

const mockUser: any = { id: '1', email: 'emilio@example.com', name: 'Emilio' };
const memberUser: any = { id: '2', email: 'ana@example.com', name: 'Ana' };

const ownerRole: any = { id: '10', name: RoleName.OWNER };
const memberRole: any = { id: '20', name: RoleName.MEMBER };

const mockHome: any = {
  id: '100',
  name: 'Casa Jasso',
  invitation_code: 'abc123',
  user_id: '1',
  points: 0,
};

const mockHomeRepository = {
  findOneBy: jest.fn(),
  findByIds: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRoleService = {
  findOneBy: jest.fn(),
};

const mockUserHomeRoleService = {
  assign: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findAll: jest.fn(),
  exists: jest.fn(),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn(),
    save: jest.fn(),
  },
};

// EntityManager expuesto dentro de DataSource.transaction(cb).
const mockEntityManager = {
  findOne: jest.fn(),
  count: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
  transaction: jest.fn((cb: any) => cb(mockEntityManager)),
};

describe('HomeService', () => {
  let service: HomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Home), useValue: mockHomeRepository },
        { provide: RoleService, useValue: mockRoleService },
        { provide: UserHomeRoleService, useValue: mockUserHomeRoleService },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('C09 - Crear hogar con nombre válido', () => {
    it('debe crear el hogar, generar código y asignar al usuario como OWNER', async () => {
      mockRoleService.findOneBy.mockResolvedValue(ownerRole);
      mockQueryRunner.manager.create.mockImplementation((_entity, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue(mockHome);

      const result = await service.create({ name: 'Casa Jasso' } as any, mockUser);

      // Se buscó el rol OWNER
      expect(mockRoleService.findOneBy).toHaveBeenCalledWith({ name: RoleName.OWNER });
      // Se abrió y confirmó la transacción
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // Se guardaron tres entidades: el hogar, el user_home_role y la mascota.
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });
  });

  describe('C16 - Rollback al fallar la creación del hogar', () => {
    it('debe revertir la transacción y propagar el error si falla una escritura', async () => {
      mockRoleService.findOneBy.mockResolvedValue(ownerRole);
      mockQueryRunner.manager.create.mockImplementation((_entity, data) => data);
      // El primer save (hogar) pasa, el segundo (rol) falla
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockHome)
        .mockRejectedValueOnce(new Error('DB write failed'));

      await expect(
        service.create({ name: 'Casa Jasso' } as any, mockUser),
      ).rejects.toThrow('DB write failed');

      // La transacción se revirtió y NO se confirmó
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('debe lanzar 500 si el rol OWNER no está configurado', async () => {
      mockRoleService.findOneBy.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Casa Jasso' } as any, mockUser),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('C10 - Unirse a hogar con código válido', () => {
    it('debe vincular al usuario al hogar con rol MEMBER', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleService.findOneBy.mockResolvedValue(null); // no pertenece aún
      mockRoleService.findOneBy.mockResolvedValue(memberRole);
      mockUserHomeRoleService.assign.mockResolvedValue({});

      const result = await service.join({ invitation_code: 'abc123' } as any, memberUser);

      expect(mockUserHomeRoleService.assign).toHaveBeenCalledWith(
        memberUser.id,
        mockHome.id,
        memberRole.id,
      );
      expect(result).toEqual(mockHome);
    });
  });

  describe('C11 - Unirse a hogar con código inválido', () => {
    it('debe lanzar NotFoundException (404) si el código no existe', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.join({ invitation_code: 'noexiste' } as any, memberUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('C17 - Unirse a un hogar al que ya se pertenece', () => {
    it('debe lanzar ConflictException (409) si el usuario ya es miembro', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      // join() comprueba la pertenencia con exists(), no con findOneBy.
      mockUserHomeRoleService.exists.mockResolvedValue({ user_id: memberUser.id }); // ya pertenece

      await expect(
        service.join({ invitation_code: 'abc123' } as any, memberUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('C18 - Listar hogares de un usuario con hogares', () => {
    it('debe devolver el arreglo de hogares del usuario', async () => {
      mockUserHomeRoleService.findAll.mockResolvedValue([
        { home_id: '100' },
        { home_id: '101' },
      ]);
      mockHomeRepository.findByIds.mockResolvedValue([mockHome, { ...mockHome, id: '101' }]);

      const result = await service.findAll(mockUser);

      expect(result).toHaveLength(2);
      expect(mockHomeRepository.findByIds).toHaveBeenCalledWith(['100', '101']);
    });

    it('debe devolver arreglo vacío si el usuario no tiene hogares', async () => {
      mockUserHomeRoleService.findAll.mockResolvedValue([]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('C19 - Consultar un hogar inexistente', () => {
    it('debe lanzar NotFoundException (404) si el hogar no existe', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('999', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('C20 - Editar hogar siendo solo Miembro', () => {
    it('debe lanzar ForbiddenException (403) si el usuario no es OWNER', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      // El usuario pertenece al hogar pero con rol MEMBER
      mockUserHomeRoleService.findOne.mockResolvedValue({
        user_id: memberUser.id,
        home_id: mockHome.id,
        role: memberRole,
      });

      // update() valida que el solicitante sea OWNER, no solo que pertenezca.
      await expect(
        service.update(mockHome.id, { name: 'Nuevo' } as any, memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('C21 - Eliminar hogar siendo solo Miembro', () => {
    it('debe lanzar ForbiddenException (403) si el usuario no es OWNER', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleService.findOne.mockResolvedValue({
        user_id: memberUser.id,
        home_id: mockHome.id,
        role: memberRole,
      });

      // remove() valida rol OWNER, igual que update().
      await expect(service.remove(mockHome.id, memberUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C12 — Asignación de rol Dueño por un Dueño  (TDD: método no existe en HomeService)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('C12 - Asignación de rol Dueño por un Dueño', () => {
    it.todo(
      'debe actualizar el rol de un miembro a OWNER cuando lo solicita un OWNER (HTTP 200) ' +
        '— pendiente: definir si vive en HomeService o UserHomeRoleService.updateRole',
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C13 — Intento de asignación de rol por un Miembro  (TDD: método no existe)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('C13 - Intento de asignación de rol por un Miembro', () => {
    it.todo(
      'debe lanzar ForbiddenException (403) cuando un MEMBER intenta asignar roles ' +
        '— nota: UserHomeRoleService.updateRole hoy lanza NotFoundException, debería ser Forbidden',
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C14 / Leave — Salir del hogar
  // ═══════════════════════════════════════════════════════════════════════════
  describe('leave()', () => {
    const homeTasks = [{ id: 't1' }, { id: 't2' }];

    // Escenario 1: un MEMBER sale de un hogar con varios integrantes.
    it('desvincula al miembro, libera sus ocurrencias y borra sus preferencias', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        user_id: memberUser.id,
        home_id: mockHome.id,
        role_id: memberRole.id,
        role: memberRole,
      });
      mockEntityManager.find.mockResolvedValue(homeTasks);

      const result = await service.leave(mockHome.id, memberUser);

      // No se cuenta a los OWNER porque quien sale es MEMBER.
      expect(mockEntityManager.count).not.toHaveBeenCalled();

      // Preferencias borradas, acotadas a este usuario y a las tareas del hogar.
      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        Preference,
        expect.objectContaining({ user_id: memberUser.id, task_id: expect.anything() }),
      );

      // Ocurrencias del usuario quedan sin responsable.
      const [entity, criteria, patch] = mockEntityManager.update.mock.calls[0];
      expect(entity).toBe(TaskOccurrence);
      expect(criteria).toEqual(
        expect.objectContaining({ user_id: memberUser.id, task_id: expect.anything() }),
      );
      expect(patch).toEqual({ user_id: null });

      // Membresía eliminada (cascada a blocked_schedules).
      expect(mockEntityManager.remove).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Has salido del hogar' });
    });

    // Escenario 2: el único OWNER no puede salir.
    it('bloquea con ConflictException (409) si es el único OWNER', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        user_id: mockUser.id,
        home_id: mockHome.id,
        role_id: ownerRole.id,
        role: ownerRole,
      });
      mockEntityManager.count.mockResolvedValue(1);

      await expect(service.leave(mockHome.id, mockUser)).rejects.toThrow(
        ConflictException,
      );

      // No se tocó nada: ni preferencias, ni ocurrencias, ni membresía.
      expect(mockEntityManager.delete).not.toHaveBeenCalled();
      expect(mockEntityManager.update).not.toHaveBeenCalled();
      expect(mockEntityManager.remove).not.toHaveBeenCalled();
    });

    // Escenario 3: un OWNER puede salir si existe otro OWNER.
    it('permite salir a un OWNER cuando hay otro OWNER en el hogar', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        user_id: mockUser.id,
        home_id: mockHome.id,
        role_id: ownerRole.id,
        role: ownerRole,
      });
      mockEntityManager.count.mockResolvedValue(2);
      mockEntityManager.find.mockResolvedValue(homeTasks);

      const result = await service.leave(mockHome.id, mockUser);

      expect(mockEntityManager.remove).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Has salido del hogar' });
    });

    // Escenario 4: un no-miembro no puede salir.
    it('rechaza con BadRequestException si el usuario no pertenece al hogar', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.leave(mockHome.id, memberUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockEntityManager.remove).not.toHaveBeenCalled();
    });

    // Escenario 5: aislamiento entre hogares — solo se afectan las tareas de ESTE hogar.
    it('acota los cambios a las tareas del hogar que se abandona', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        user_id: memberUser.id,
        home_id: mockHome.id,
        role_id: memberRole.id,
        role: memberRole,
      });
      mockEntityManager.find.mockResolvedValue(homeTasks);

      await service.leave(mockHome.id, memberUser);

      // Las tareas se buscan filtrando por el hogar abandonado.
      expect(mockEntityManager.find).toHaveBeenCalledWith(
        Task,
        expect.objectContaining({ where: { home_id: mockHome.id } }),
      );
    });

    // Escenario 5b: hogar sin tareas — no se intentan borrados/updates con In([]).
    it('no ejecuta delete/update de tareas si el hogar no tiene tareas', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        user_id: memberUser.id,
        home_id: mockHome.id,
        role_id: memberRole.id,
        role: memberRole,
      });
      mockEntityManager.find.mockResolvedValue([]);

      await service.leave(mockHome.id, memberUser);

      expect(mockEntityManager.delete).not.toHaveBeenCalled();
      expect(mockEntityManager.update).not.toHaveBeenCalled();
      expect(mockEntityManager.remove).toHaveBeenCalledTimes(1);
    });

    // Escenario 6: reingreso tras salir — join() crea una nueva membresía MEMBER.
    it('permite reingresar con el código tras haber salido', async () => {
      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleService.exists.mockResolvedValue(false); // ya no pertenece
      mockRoleService.findOneBy.mockResolvedValue(memberRole);
      mockUserHomeRoleService.assign.mockResolvedValue({});

      const result = await service.join(
        { invitation_code: mockHome.invitation_code } as any,
        memberUser,
      );

      expect(mockUserHomeRoleService.assign).toHaveBeenCalledWith(
        memberUser.id,
        mockHome.id,
        memberRole.id,
      );
      expect(result).toEqual(mockHome);
    });
  });
});