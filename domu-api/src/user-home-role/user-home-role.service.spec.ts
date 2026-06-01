import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserHomeRoleService } from './user-home-role.service';
import { UserHomeRole } from './entities/user-home-role.entity';
import { Home } from '@/home/entities/home.entity';
import { User } from '@/users/entities/user.entity';
import { Role } from '@/role/entities/role.entity';

const ownerUser: any = { id: '1', email: 'emilio@example.com', name: 'Emilio' };
const memberUser: any = { id: '2', email: 'ana@example.com', name: 'Ana' };

const ownerRole: any = { id: '10', name: 'owner' };
const memberRole: any = { id: '20', name: 'member' };

const mockHome: any = { id: '100', name: 'Casa Jasso' };

const mockHomeRepository = { findOneBy: jest.fn() };
const mockUserRepository = { findOneBy: jest.fn() };
const mockRoleRepository = { findOneBy: jest.fn() };
const mockUserHomeRoleRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
};

describe('UserHomeRoleService', () => {
  let service: UserHomeRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserHomeRoleService,
        { provide: getRepositoryToken(Home), useValue: mockHomeRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: getRepositoryToken(UserHomeRole), useValue: mockUserHomeRoleRepository },
      ],
    }).compile();

    service = module.get<UserHomeRoleService>(UserHomeRoleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('C12 - Asignación de rol Dueño por un Dueño', () => {
    it('debe actualizar el rol del miembro a OWNER cuando lo solicita un OWNER', async () => {
      const targetUhr: any = { user_id: memberUser.id, home_id: mockHome.id, role: memberRole };

      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleRepository.findOneBy
        .mockResolvedValueOnce(targetUhr)   // el UHR a actualizar
        .mockResolvedValueOnce({ role: ownerRole }); // verificación: authUser es owner
      mockRoleRepository.findOneBy.mockResolvedValue(ownerRole); // rol destino
      mockUserHomeRoleRepository.save.mockImplementation((uhr) => uhr);

      const result = await service.updateRole(
        ownerUser,
        memberUser.id,
        mockHome.id,
        ownerRole.id,
      );

      expect(result.role).toEqual(ownerRole);
      expect(mockUserHomeRoleRepository.save).toHaveBeenCalled();
    });
  });

  describe('C13 - Intento de asignación de rol por un Miembro', () => {
    it('debe lanzar ForbiddenException (403) cuando un MEMBER intenta asignar roles', async () => {
      const targetUhr: any = { user_id: memberUser.id, home_id: mockHome.id, role: memberRole };

      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleRepository.findOneBy
        .mockResolvedValueOnce(targetUhr) // el UHR a actualizar
        .mockResolvedValueOnce(null); // verificación: authUser NO es owner
      mockRoleRepository.findOneBy.mockResolvedValue(ownerRole);

      // TODO: updateRole lanza NotFoundException('Only owners can update roles'), pero
      // lka tabla (C13) especifica 403, así que debe cambiarse a ForbiddenException
      await expect(
        service.updateRole(memberUser, memberUser.id, mockHome.id, ownerRole.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('C14 - Salida exitosa del hogar', () => {
    it('debe desvincular al usuario del hogar cuando no es el único Dueño', async () => {
      const membership: any = { user_id: memberUser.id, home_id: mockHome.id, role: memberRole };

      mockUserHomeRoleRepository.findOne.mockResolvedValue(membership);
      mockUserHomeRoleRepository.count.mockResolvedValue(2);
      mockUserHomeRoleRepository.remove.mockResolvedValue(membership);

      // TODO: Implementar:
      // leave(userId, homeId) -> valida que no sea único owner -> remove(membership)
      // -> (regla de negocio) tareas asignadas quedan con responsible_id nulo
      await service.leave(memberUser.id, mockHome.id);

      expect(mockUserHomeRoleRepository.remove).toHaveBeenCalledWith(membership);
    });
  });

  describe('C15 - Intento de salida del único Dueño', () => {
    it('debe lanzar UnprocessableEntityException (422) si el usuario es el único Dueño', async () => {
      const ownerMembership: any = { user_id: ownerUser.id, home_id: mockHome.id, role: ownerRole };

      mockUserHomeRoleRepository.findOne.mockResolvedValue(ownerMembership);
      // Solo hay UN owner en el hogar → no puede salir
      mockUserHomeRoleRepository.count.mockResolvedValue(1);

      // TODO: leave debe verificar que no sea el único owner antes de remover.
      await expect(service.leave(ownerUser.id, mockHome.id)).rejects.toThrow(
        UnprocessableEntityException,
      );

      // No debe haber removido nada
      expect(mockUserHomeRoleRepository.remove).not.toHaveBeenCalled();
    });
  });
});