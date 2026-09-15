import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VirtualPetService } from './virtual-pet.service';
import { VirtualPet } from './entities/virtual-pet.entity';
import { UsersService } from '@/users/users.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

const mockAuthUser: any = { id: '1', email: 'emilio@example.com' };

const mockPet: any = { home_id: '100', name: 'Firulais', level: 0 };

const mockPetRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockUsersService = {};

const mockUserHomeRoleService = {
  exists: jest.fn(),
};

describe('VirtualPetService', () => {
  let service: VirtualPetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualPetService,
        {
          provide: getRepositoryToken(VirtualPet),
          useValue: mockPetRepository,
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: UserHomeRoleService, useValue: mockUserHomeRoleService },
      ],
    }).compile();

    service = module.get<VirtualPetService>(VirtualPetService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: any = { home_id: '100', name: 'Firulais' };

    it('crea la mascota si el usuario pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue({});
      mockPetRepository.create.mockReturnValue(mockPet);
      mockPetRepository.save.mockResolvedValue(mockPet);

      const result = await service.create(dto, mockAuthUser);

      expect(mockUserHomeRoleService.exists).toHaveBeenCalledWith({
        user_id: mockAuthUser.id,
        home_id: dto.home_id,
      });
      expect(mockPetRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPet);
    });

    it('lanza ForbiddenException si el usuario NO pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue(null);

      await expect(service.create(dto, mockAuthUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPetRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retorna la mascota si el usuario pertenece al hogar', async () => {
      mockPetRepository.findOneBy.mockResolvedValue(mockPet);
      mockUserHomeRoleService.exists.mockResolvedValue({});

      const result = await service.findOne('100', mockAuthUser);

      expect(mockUserHomeRoleService.exists).toHaveBeenCalledWith({
        user_id: mockAuthUser.id,
        home_id: '100',
      });
      expect(result).toEqual(mockPet);
    });

    it('lanza ForbiddenException si el usuario NO pertenece al hogar', async () => {
      mockPetRepository.findOneBy.mockResolvedValue(mockPet);
      mockUserHomeRoleService.exists.mockResolvedValue(null);

      await expect(service.findOne('100', mockAuthUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la mascota no existe', async () => {
      mockPetRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('999', mockAuthUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserHomeRoleService.exists).not.toHaveBeenCalled();
    });
  });

  describe('update (preexistente)', () => {
    it('actualiza la mascota si el usuario pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue({});
      mockPetRepository.update.mockResolvedValue({ affected: 1 });
      mockPetRepository.findOneBy.mockResolvedValue({
        ...mockPet,
        name: 'Nuevo Nombre',
      });

      const result = await service.update(
        '100',
        { name: 'Nuevo Nombre' } as any,
        mockAuthUser,
      );

      expect(mockPetRepository.update).toHaveBeenCalledWith(
        { home_id: '100' },
        { name: 'Nuevo Nombre' },
      );
      expect(result).toMatchObject({ name: 'Nuevo Nombre' });
    });

    it('lanza ForbiddenException si el usuario NO pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue(null);

      await expect(
        service.update('100', { name: 'X' } as any, mockAuthUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPetRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove (preexistente)', () => {
    it('elimina la mascota si el usuario pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue({});
      mockPetRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove('100', mockAuthUser);

      expect(mockPetRepository.delete).toHaveBeenCalledWith({
        home_id: '100',
      });
      expect(result).toEqual({ message: 'Mascota eliminada exitosamente' });
    });

    it('lanza ForbiddenException si el usuario NO pertenece al hogar', async () => {
      mockUserHomeRoleService.exists.mockResolvedValue(null);

      await expect(service.remove('100', mockAuthUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPetRepository.delete).not.toHaveBeenCalled();
    });
  });
});
