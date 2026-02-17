import { Test, TestingModule } from '@nestjs/testing';
import { UserHomeRoleController } from './user-home-role.controller';
import { UserHomeRoleService } from './user-home-role.service';

describe('UserHomeRoleController', () => {
  let controller: UserHomeRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserHomeRoleController],
      providers: [UserHomeRoleService],
    }).compile();

    controller = module.get<UserHomeRoleController>(UserHomeRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
