import { Test, TestingModule } from '@nestjs/testing';
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
};

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
      const createdTask = { id: 't1', name: validDto.name, home_id: validDto.home_id };
      mockUhrService.exists.mockResolvedValue(true);
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
});
