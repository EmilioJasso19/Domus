import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { RoleName } from './constants/roles.constants';

const mockRole: any = { id: '10', name: RoleName.OWNER, description: null };

const mockRoleRepository = {
  findOneBy: jest.fn(),
};

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('retorna el rol por id', async () => {
      mockRoleRepository.findOneBy.mockResolvedValue(mockRole);

      const result = await service.findOne('10');

      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({ id: '10' });
      expect(result).toEqual(mockRole);
    });
  });

  describe('findOneBy', () => {
    it('retorna el rol por condición', async () => {
      mockRoleRepository.findOneBy.mockResolvedValue(mockRole);

      const result = await service.findOneBy({ name: RoleName.OWNER });

      expect(mockRoleRepository.findOneBy).toHaveBeenCalledWith({
        name: RoleName.OWNER,
      });
      expect(result).toEqual(mockRole);
    });
  });
});
