import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VirtualPetService } from './virtual-pet.service';
import { VirtualPet } from './entities/virtual-pet.entity';
import { UsersService } from '@/users/users.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';

describe('VirtualPetService', () => {
  let service: VirtualPetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualPetService,
        { provide: getRepositoryToken(VirtualPet), useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: UserHomeRoleService, useValue: {} },
      ],
    }).compile();

    service = module.get<VirtualPetService>(VirtualPetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
