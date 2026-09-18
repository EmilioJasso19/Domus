import { Test, TestingModule } from '@nestjs/testing';
// expo-server-sdk es ESM-only; la cadena de dependencias lo carga al resolver.
jest.mock('expo-server-sdk', () => ({ Expo: class {} }));
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { FrequencyType } from './enums/frequency-type.enum';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { TaskOccurrencesService } from '@/task-occurrences/task-occurrences.service';

const authUser: any = { id: '1', name: 'Emilio' };

const validDto: any = {
  home_id: 'h1',
  name: 'Sacar la basura',
  due_date: '2026-06-25',
  frequency_type: FrequencyType.DAILY,
  physical_effort: 2,
};

const mockTaskRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
};

const mockUhrService = {
  exists: jest.fn(),
  findOneBy: jest.fn(),
  findAllByHome: jest.fn(),
};

const participant = (user_id: string, role: string): any => ({
  user_id,
  user: { id: user_id },
  role: { name: role },
});
// Hogar típico: un OWNER ('1') y un MEMBER ('2').
const mixedHome = () => [participant('1', 'OWNER'), participant('2', 'MEMBER')];
const ownerOnlyHome = () => [participant('1', 'OWNER')];

const mockOccurrencesService = {
  createForTask: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: UserHomeRoleService, useValue: mockUhrService },
        { provide: TaskOccurrencesService, useValue: mockOccurrencesService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // C22 — Crear tarea con campos válidos
  describe('C22 - Crear tarea con campos válidos', () => {
    it('crea la plantilla y su primera ocurrencia cuando el usuario pertenece al hogar', async () => {
      const createdTask = {
        id: 't1',
        name: validDto.name,
        home_id: validDto.home_id,
      };
      mockUhrService.exists.mockResolvedValue(true);
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());
      mockTaskRepository.create.mockImplementation((data) => data);
      mockTaskRepository.save.mockResolvedValue(createdTask);
      mockOccurrencesService.createForTask.mockResolvedValue(undefined);

      const dto = { ...validDto, due_time: '09:00', responsible_id: '2' };
      const result = await service.create(dto, authUser);

      expect(mockUhrService.exists).toHaveBeenCalledWith({
        user_id: authUser.id,
        home_id: validDto.home_id,
      });
      // La primera ocurrencia se crea con fecha/hora/responsable del dto.
      expect(mockOccurrencesService.createForTask).toHaveBeenCalledWith(
        createdTask.id,
        dto.due_date,
        dto.due_time,
        dto.responsible_id,
      );
      expect(result).toEqual(createdTask);
    });

    it('rechaza con BadRequest si el usuario no pertenece al hogar', async () => {
      mockUhrService.exists.mockResolvedValue(null);

      await expect(service.create(validDto, authUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });
  });

  // C23 — Crear tarea con nombre demasiado corto (validación de DTO).
  // El contrato exige @MinLength(3); un nombre de 2 caracteres es inválido.
  describe('C23 - Nombre de tarea demasiado corto', () => {
    it('falla la validación cuando el nombre tiene menos de 3 caracteres', async () => {
      const dto = plainToInstance(CreateTaskDto, { ...validDto, name: 'ab' });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.constraints).toHaveProperty('minLength');
    });

    it('pasa la validación con un nombre válido', async () => {
      const dto = plainToInstance(CreateTaskDto, validDto);
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'name')).toBeUndefined();
    });
  });
  // members_only — "solo miembros": solo usuarios con rol MEMBER pueden ser
  // responsables. Vive en la plantilla (tasks), no en la ocurrencia.
  describe('members_only en create', () => {
    beforeEach(() => {
      mockUhrService.exists.mockResolvedValue(true);
      mockTaskRepository.create.mockImplementation((data) => data);
      mockTaskRepository.save.mockImplementation((data) =>
        Promise.resolve({ id: 't1', ...data }),
      );
      mockOccurrencesService.createForTask.mockResolvedValue(undefined);
    });

    const savedPayload = () => mockTaskRepository.save.mock.calls[0][0];

    it('omitido y el hogar tiene MEMBER: persiste true', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());

      await service.create(validDto, authUser);

      expect(savedPayload()).toEqual(
        expect.objectContaining({ members_only: true }),
      );
    });

    it('explícito false: persiste false', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());

      await service.create({ ...validDto, members_only: false }, authUser);

      expect(savedPayload()).toEqual(
        expect.objectContaining({ members_only: false }),
      );
    });

    it('omitido y sin MEMBER en el hogar: persiste false', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(ownerOnlyHome());

      await service.create(validDto, authUser);

      expect(savedPayload()).toEqual(
        expect.objectContaining({ members_only: false }),
      );
    });

    it('explícito true y sin MEMBER: BadRequest', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(ownerOnlyHome());

      await expect(
        service.create({ ...validDto, members_only: true }, authUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('responsible_id OWNER con members_only=true: BadRequest', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());

      await expect(
        service.create(
          { ...validDto, members_only: true, responsible_id: '1' },
          authUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('responsible_id fuera del hogar: BadRequest', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());

      await expect(
        service.create({ ...validDto, responsible_id: '99' }, authUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('responsible_id OWNER con members_only=false: OK', async () => {
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());

      await service.create(
        { ...validDto, members_only: false, responsible_id: '1' },
        authUser,
      );

      expect(mockOccurrencesService.createForTask).toHaveBeenCalledWith(
        't1',
        validDto.due_date,
        undefined,
        '1',
      );
    });
  });

  describe('members_only - validación de DTO', () => {
    it('es opcional', async () => {
      const dto = plainToInstance(CreateTaskDto, validDto);
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'members_only')).toBeUndefined();
    });

    it('rechaza un valor no booleano', async () => {
      const dto = plainToInstance(CreateTaskDto, {
        ...validDto,
        members_only: 'yes',
      });
      const errors = await validate(dto);
      const err = errors.find((e) => e.property === 'members_only');
      expect(err).toBeDefined();
      expect(err?.constraints).toHaveProperty('isBoolean');
    });
  });

  describe('members_only en update', () => {
    it('poner true en un hogar sin MEMBER: BadRequest', async () => {
      mockTaskRepository.findOneBy.mockResolvedValue({
        id: 't1',
        home_id: 'h1',
        members_only: false,
      });
      mockUhrService.findAllByHome.mockResolvedValue(ownerOnlyHome());

      await expect(
        service.update('t1', { members_only: true }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('pasar de false a true guarda y no toca ocurrencias', async () => {
      const task = { id: 't1', home_id: 'h1', members_only: false };
      mockTaskRepository.findOneBy.mockResolvedValue(task);
      mockUhrService.findAllByHome.mockResolvedValue(mixedHome());
      mockTaskRepository.save.mockImplementation((t) => Promise.resolve(t));

      const result = await service.update('t1', { members_only: true });

      expect(result).toEqual(expect.objectContaining({ members_only: true }));
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', members_only: true }),
      );
      expect(mockOccurrencesService.createForTask).not.toHaveBeenCalled();
    });
  });
});
