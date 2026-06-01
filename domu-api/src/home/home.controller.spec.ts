import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

// ── Mock del HomeService ──────────────────────────────────────────────────────
const mockHomeService = {
  create: jest.fn(),
  join: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockUser: any = { id: '1', email: 'emilio@example.com', name: 'Emilio' };
const memberUser: any = { id: '2', email: 'ana@example.com', name: 'Ana' };

const mockHome: any = {
  id: '100',
  name: 'Casa Jasso',
  invitation_code: 'abc123',
};

describe('HomeController', () => {
  let controller: HomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: mockHomeService }],
    }).compile();

    controller = module.get<HomeController>(HomeController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── POST /homes ──────────────────────────────────────────────────────────
  describe('POST /homes – create()', () => {
    // C09
    it('C09: debe llamar a homeService.create y devolver el hogar creado', async () => {
      mockHomeService.create.mockResolvedValue(mockHome);

      const result = await controller.create({ name: 'Casa Jasso' } as any, mockUser);

      expect(mockHomeService.create).toHaveBeenCalledWith({ name: 'Casa Jasso' }, mockUser);
      expect(result).toEqual(mockHome);
    });

    // C16 (rollback se propaga como error genérico desde el service)
    it('C16: debe propagar el error si la transacción falla', async () => {
      mockHomeService.create.mockRejectedValue(new Error('DB write failed'));

      await expect(
        controller.create({ name: 'Casa Jasso' } as any, mockUser),
      ).rejects.toThrow('DB write failed');
    });
  });

  // ── POST /homes/join ─────────────────────────────────────────────────────
  describe('POST /homes/join – join()', () => {
    // C10
    it('C10: debe llamar a homeService.join y devolver el hogar', async () => {
      mockHomeService.join.mockResolvedValue(mockHome);

      const result = await controller.join({ invitation_code: 'abc123' } as any, memberUser);

      expect(mockHomeService.join).toHaveBeenCalledWith({ invitation_code: 'abc123' }, memberUser);
      expect(result).toEqual(mockHome);
    });

    // C11
    it('C11: debe propagar NotFoundException con código inválido', async () => {
      mockHomeService.join.mockRejectedValue(new NotFoundException());

      await expect(
        controller.join({ invitation_code: 'noexiste' } as any, memberUser),
      ).rejects.toThrow(NotFoundException);
    });

    // C17
    it('C17: debe propagar ConflictException si ya pertenece al hogar', async () => {
      mockHomeService.join.mockRejectedValue(new ConflictException());

      await expect(
        controller.join({ invitation_code: 'abc123' } as any, memberUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── GET /homes ───────────────────────────────────────────────────────────
  describe('GET /homes – findAll()', () => {
    // C18
    it('C18: debe devolver el arreglo de hogares del usuario', async () => {
      mockHomeService.findAll.mockResolvedValue([mockHome]);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual([mockHome]);
    });
  });

  // ── GET /homes/:id ───────────────────────────────────────────────────────
  describe('GET /homes/:id – findOne()', () => {
    // C19
    it('C19: debe propagar NotFoundException si el hogar no existe', async () => {
      mockHomeService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  // ── PATCH /homes/:id ─────────────────────────────────────────────────────
  describe('PATCH /homes/:id – update()', () => {
    // C20
    it('C20: debe propagar ForbiddenException si un Miembro intenta editar', async () => {
      // ⚠️ TDD: depende de que el service lance ForbiddenException (lógica pendiente)
      mockHomeService.update.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.update(mockHome.id, { name: 'Nuevo' } as any, memberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── DELETE /homes/:id ────────────────────────────────────────────────────
  describe('DELETE /homes/:id – remove()', () => {
    // C21
    it('C21: debe propagar ForbiddenException si un Miembro intenta eliminar', async () => {
      // ⚠️ TDD: depende de que el service lance ForbiddenException (lógica pendiente)
      mockHomeService.remove.mockRejectedValue(new ForbiddenException());

      await expect(controller.remove(memberUser, mockHome.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});