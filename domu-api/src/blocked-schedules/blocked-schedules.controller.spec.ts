
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlockedSchedulesController } from './blocked-schedules.controller';
import { BlockedSchedulesService } from './blocked-schedules.service';
import { Days } from './enums/days.enums';
import { CreateBlockedScheduleDto } from './dto/create-blocked-schedule.dto';
import { User } from '@/users/entities/user.entity';

const authUser = { id: '1' } as User;

const dto: CreateBlockedScheduleDto = {
  home_id: '10',
  day: Days.MONDAY,
  start_time: '09:00',
  end_time: '17:00',
  start_date: '2026-06-01',
  end_date: '2026-06-30',
};

const mockService = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('BlockedSchedulesController', () => {
  let controller: BlockedSchedulesController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockedSchedulesController],
      providers: [{ provide: BlockedSchedulesService, useFactory: mockService }],
    }).compile();

    controller = module.get(BlockedSchedulesController);
    service = module.get(BlockedSchedulesService);
  });

  it('está definido', () => {
    expect(controller).toBeDefined();
  });

  // --- create ---
  describe('create', () => {
    it('delega en service.create con el dto y el usuario autenticado', async () => {
      const expected = { id: '100', ...dto, user_id: authUser.id };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto, authUser);

      expect(service.create).toHaveBeenCalledWith(dto, authUser);
      expect(result).toEqual(expected);
    });

    it('propaga la excepción si el usuario no pertenece al hogar (C31)', async () => {
      service.create.mockRejectedValue(new ForbiddenException());
      await expect(controller.create(dto, authUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // --- findOne ---
  describe('findOne', () => {
    it('delega en service.findOne con el id', async () => {
      const expected = { id: '100' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('100', authUser);

      expect(service.findOne).toHaveBeenCalledWith('100', authUser);
      expect(result).toEqual(expected);
    });
  });

  // --- update ---
  describe('update', () => {
    it('delega en service.update con id, dto y usuario autenticado (C35)', async () => {
      const patch = { start_time: '10:00' };
      service.update.mockResolvedValue({ id: '100', ...patch });

      const result = await controller.update('100', patch, authUser);

      expect(service.update).toHaveBeenCalledWith('100', patch, authUser);
      expect(result).toEqual({ id: '100', ...patch });
    });

    it('propaga Forbidden al editar horario ajeno (C38)', async () => {
      service.update.mockRejectedValue(new ForbiddenException());
      await expect(controller.update('100', {}, authUser)).rejects.toThrow(ForbiddenException);
    });

    it('propaga NotFound al editar horario inexistente (C36)', async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update('404', {}, authUser)).rejects.toThrow(NotFoundException);
    });
  });

  // --- remove ---
  describe('remove', () => {
    it('delega en service.remove con id y usuario autenticado (C37)', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('100', authUser);

      expect(service.remove).toHaveBeenCalledWith('100', authUser);
    });

    it('propaga Forbidden al eliminar horario ajeno (C38)', async () => {
      service.remove.mockRejectedValue(new ForbiddenException());
      await expect(controller.remove('100', authUser)).rejects.toThrow(ForbiddenException);
    });
  });
});