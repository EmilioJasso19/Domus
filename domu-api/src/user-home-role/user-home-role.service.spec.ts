import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserHomeRoleService } from './user-home-role.service';
import { UserHomeRole } from './entities/user-home-role.entity';
import { Home } from '@/home/entities/home.entity';
import { User } from '@/users/entities/user.entity';
import { Role } from '@/role/entities/role.entity';

const ownerUser: any = { id: '1', email: 'emilio@example.com', name: 'Emilio' };
const memberUser: any = { id: '2', email: 'ana@example.com', name: 'Ana' };

const ownerRole: any = { id: '10', name: 'OWNER' };
const memberRole: any = { id: '20', name: 'MEMBER' };

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

  // updateRole comprueba que el solicitante sea OWNER con un findOne (incluye la
  // relación role); la membresía objetivo se busca con findOneBy.
  describe('C12 - Asignación de rol Dueño por un Dueño', () => {
    it('debe actualizar el rol del miembro a OWNER cuando lo solicita un OWNER', async () => {
      const targetUhr: any = { user_id: memberUser.id, home_id: mockHome.id, role: memberRole };

      mockHomeRepository.findOneBy.mockResolvedValue(mockHome);
      mockUserHomeRoleRepository.findOneBy.mockResolvedValue(targetUhr); // UHR a actualizar
      mockRoleRepository.findOneBy.mockResolvedValue(ownerRole); // rol destino
      // El solicitante SÍ es OWNER del hogar.
      mockUserHomeRoleRepository.findOne.mockResolvedValue({
        user_id: ownerUser.id,
        home_id: mockHome.id,
        role: ownerRole,
      });
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
      mockUserHomeRoleRepository.findOneBy.mockResolvedValue(targetUhr);
      mockRoleRepository.findOneBy.mockResolvedValue(ownerRole);
      // El solicitante NO es OWNER → findOne no encuentra membresía de owner.
      mockUserHomeRoleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(memberUser, memberUser.id, mockHome.id, ownerRole.id),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUserHomeRoleRepository.save).not.toHaveBeenCalled();
    });
  });

  // Nota: la salida del hogar (C14/C15) vive en HomeService.leave y se prueba en
  // home/home.service.spec.ts. No se duplica aquí.
});
