import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { SavePreferencesDto } from './dto/save-preference-dto';

const mockPreferencesService = {
  saveMany: jest.fn(),
  findAllByUserAndHome: jest.fn(),
};

const mockUser: any = { id: '1', name: 'Emilio' };

describe('PreferencesController', () => {
  let controller: PreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        { provide: PreferencesService, useValue: mockPreferencesService },
      ],
    }).compile();

    controller = module.get<PreferencesController>(PreferencesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ===== POST /preferences/many/:homeId =====
  describe('saveMany()', () => {
    // CP-53 (controller): delega al service con (dto, homeId, user) en ese orden
    it('CP-53: debe llamar a preferencesService.saveMany con dto, homeId y user', async () => {
      const dto = { preferences: [{ task_id: '10', score: 1 }] } as any;
      mockPreferencesService.saveMany.mockResolvedValue([]);

      await controller.saveMany(dto, '100', mockUser);

      expect(mockPreferencesService.saveMany).toHaveBeenCalledWith(dto, '100', mockUser);
    });

    // CP-56 (controller): propaga ForbiddenException
    it('CP-56: debe propagar ForbiddenException cuando el usuario no pertenece al hogar', async () => {
      const dto = { preferences: [{ task_id: '10', score: 1 }] } as any;
      mockPreferencesService.saveMany.mockRejectedValue(
        new ForbiddenException('No perteneces a este hogar'),
      );

      await expect(controller.saveMany(dto, '999', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===== GET /preferences/home/:homeId =====
  describe('findAll()', () => {
    // CP-58 (controller): delega con (user.id, homeId)
    it('CP-58: debe llamar a findAllByUserAndHome con el id del usuario y el homeId', async () => {
      mockPreferencesService.findAllByUserAndHome.mockResolvedValue([]);

      await controller.findAll(mockUser, '100');

      expect(mockPreferencesService.findAllByUserAndHome).toHaveBeenCalledWith('1', '100');
    });
  });

  // CP-55: rango de score fuera de límites. Se valida a nivel de DTO (las mismas
  // reglas class-validator que aplica el ValidationPipe en runtime).
  describe('CP-55 - Validación de rango de score', () => {
    it('rechaza un score fuera de [-1, 1]', async () => {
      const dto = plainToInstance(SavePreferencesDto, {
        preferences: [{ task_id: 't1', score: 2 }],
      });

      const errors = await validate(dto);
      const arrError = errors.find((e) => e.property === 'preferences');
      expect(arrError).toBeDefined();
      // La violación de @Max(1) aparece en el elemento anidado del arreglo.
      expect(JSON.stringify(arrError)).toMatch(/max/i);
    });

    it('acepta los scores válidos -1, 0 y 1', async () => {
      const dto = plainToInstance(SavePreferencesDto, {
        preferences: [
          { task_id: 't1', score: -1 },
          { task_id: 't2', score: 0 },
          { task_id: 't3', score: 1 },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});