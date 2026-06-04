import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { BlockedSchedulesService } from './blocked-schedules.service';
import { BlockedSchedule } from './entities/blocked-schedule.entity';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { Days } from './enums/days.enums';
import { CreateBlockedScheduleDto } from './dto/create-blocked-schedule.dto';
import { User } from '@/users/entities/user.entity';

// --- Mocks ---
type MockRepo = Partial<Record<keyof Repository<BlockedSchedule>, jest.Mock>>;

const mockRepo = (): MockRepo => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

const mockUhrService = () => ({
  exists: jest.fn(),
});

// --- Datos de apoyo ---
const authUser = { id: '1' } as User; // usuario autenticado

const validDto: CreateBlockedScheduleDto = {
  home_id: '10',
  day: Days.MONDAY,
  start_time: '09:00',
  end_time: '17:00',
  start_date: '2026-06-01',
  end_date: '2026-06-30',
};

const buildSchedule = (overrides: Partial<BlockedSchedule> = {}): BlockedSchedule =>
  ({
    id: '100',
    user_id: '1',
    home_id: '10',
    day: Days.MONDAY,
    start_time: '09:00',
    end_time: '17:00',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    ...overrides,
  }) as BlockedSchedule;

describe('BlockedSchedulesService', () => {
  let service: BlockedSchedulesService;
  let repo: MockRepo;
  let uhr: ReturnType<typeof mockUhrService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockedSchedulesService,
        { provide: getRepositoryToken(BlockedSchedule), useFactory: mockRepo },
        { provide: UserHomeRoleService, useFactory: mockUhrService },
      ],
    }).compile();

    service = module.get(BlockedSchedulesService);
    repo = module.get(getRepositoryToken(BlockedSchedule));
    uhr = module.get(UserHomeRoleService);
  });

  it('está definido', () => {
    expect(service).toBeDefined();
  });

  // ===================== CREATE =====================
  describe('create', () => {
    // C28: Bloqueo con datos válidos -> 201
    it('C28: crea el horario con datos válidos y lo persiste', async () => {
      uhr.exists!.mockResolvedValue(true); // pertenece al hogar
      repo.findOne!.mockResolvedValue(null); // no hay duplicado
      const created = buildSchedule();
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(validDto, authUser);

      expect(result).toEqual(created);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    // C29: hora inicio >= hora fin -> 400
    it('C29: lanza BadRequest si start_time es mayor o igual a end_time', async () => {
      uhr.exists!.mockResolvedValue(true);

      await expect(
        service.create({ ...validDto, start_time: '18:00', end_time: '09:00' }, authUser),
      ).rejects.toThrow(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    // C31: usuario que no pertenece al hogar -> 403
    it('C31: lanza Forbidden si el usuario no pertenece a la casa', async () => {
      uhr.exists!.mockResolvedValue(false);

      await expect(service.create(validDto, authUser)).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    // C32: el horario siempre pertenece al usuario autenticado
    it('C32: ignora cualquier user_id externo y usa el del usuario autenticado', async () => {
      uhr.exists!.mockResolvedValue(true);
      repo.findOne!.mockResolvedValue(null);
      repo.create!.mockReturnValue(buildSchedule());
      repo.save!.mockResolvedValue(buildSchedule());

      await service.create({ ...(validDto as any), user_id: '99' }, authUser);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: authUser.id }),
      );
    });

    // C33: bloqueo duplicado -> 409
    it('C33: lanza Conflict si ya existe bloqueo con mismo usuario/hogar/día/hora', async () => {
      uhr.exists!.mockResolvedValue(true);
      repo.findOne!.mockResolvedValue(buildSchedule()); // ya existe uno idéntico

      await expect(service.create(validDto, authUser)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    // C34: bloqueo indefinido (sin fechas de vigencia) -> 201
    it('C34: crea un bloqueo indefinido cuando no se envían fechas', async () => {
      // start_date y end_date deben ser @IsOptional() en el DTO.
      uhr.exists!.mockResolvedValue(true);
      repo.findOne!.mockResolvedValue(null);
      const indefinite = buildSchedule({ start_date: undefined, end_date: undefined });
      repo.create!.mockReturnValue(indefinite);
      repo.save!.mockResolvedValue(indefinite);

      const { start_date, end_date, ...noDates } = validDto;
      const result = await service.create(noDates as CreateBlockedScheduleDto, authUser);

      expect(result.start_date).toBeUndefined();
      expect(result.end_date).toBeUndefined();
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    // Extra (criterio 5 de la HU #16): fecha inicio > fecha fin -> 400
    it('Extra: lanza BadRequest si start_date es posterior a end_date', async () => {
      uhr.exists!.mockResolvedValue(true);

      await expect(
        service.create(
          { ...validDto, start_date: '2026-06-30', end_date: '2026-06-01' },
          authUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===================== FIND ONE =====================
  describe('findOne', () => {
    it('devuelve el horario propio cuando existe', async () => {
      const s = buildSchedule();
      repo.findOne!.mockResolvedValue(s);
      await expect(service.findOne('100', authUser)).resolves.toEqual(s);
    });

    // Base de C36 (requiere que findOne lance NotFound)
    it('lanza NotFound cuando el horario no existe o no es del usuario', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.findOne('404', authUser)).rejects.toThrow(NotFoundException);
    });
  });

  // ===================== UPDATE =====================
  describe('update', () => {
    // C35: edición de horario propio -> 200
    it('C35: actualiza un horario propio con datos válidos', async () => {
      const own = buildSchedule({ user_id: authUser.id });
      repo.findOne!.mockResolvedValue(own);
      repo.save!.mockResolvedValue({ ...own, start_time: '10:00' });

      const result = await service.update('100', { start_time: '10:00' }, authUser);

      expect(result.start_time).toBe('10:00');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    // C36: edición de horario inexistente -> 404
    it('C36: lanza NotFound al editar un horario inexistente', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.update('404', { start_time: '10:00' }, authUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    // C38: edición de horario ajeno -> 403
    it('C38: lanza Forbidden al editar un horario de otro miembro', async () => {
      repo.findOne!.mockResolvedValue(buildSchedule({ user_id: '99' }));
      await expect(service.update('100', { start_time: '10:00' }, authUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    // Extra (criterio 5 de la HU #17): rango de horas inválido al editar -> 400
    it('Extra: lanza BadRequest al editar con start_time mayor a end_time', async () => {
      repo.findOne!.mockResolvedValue(buildSchedule({ user_id: authUser.id }));
      await expect(
        service.update('100', { start_time: '20:00', end_time: '08:00' }, authUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===================== REMOVE =====================
  describe('remove', () => {
    // C37: eliminación de horario propio -> 200
    it('C37: elimina un horario propio', async () => {
      const own = buildSchedule({ user_id: authUser.id });
      repo.findOne!.mockResolvedValue(own);
      repo.remove!.mockResolvedValue(own);

      await service.remove('100', authUser);
      expect(repo.remove).toHaveBeenCalledWith(own);
    });

    // C36: eliminación de horario inexistente -> 404
    it('C36: lanza NotFound al eliminar un horario inexistente', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.remove('404', authUser)).rejects.toThrow(NotFoundException);
    });

    // C38: eliminación de horario ajeno -> 403
    it('C38: lanza Forbidden al eliminar un horario de otro miembro', async () => {
      repo.findOne!.mockResolvedValue(buildSchedule({ user_id: '99' }));
      await expect(service.remove('100', authUser)).rejects.toThrow(ForbiddenException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});