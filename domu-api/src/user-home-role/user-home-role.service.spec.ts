import { Test, TestingModule } from '@nestjs/testing';
import { UserHomeRoleService } from './user-home-role.service';

describe('UserHomeRoleService', () => {
  let service: UserHomeRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserHomeRoleService],
    }).compile();

    service = module.get<UserHomeRoleService>(UserHomeRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
