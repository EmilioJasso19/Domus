import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockAuthUser = { id: '1', email: 'emilio@example.com' };

const mockUsersService = {
  findMe: jest.fn(),
  updateMe: jest.fn(),
  removeMe: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /users/me delega en findMe con el userId del token', async () => {
    mockUsersService.findMe.mockResolvedValue({ id: '1' });

    await controller.findMe(mockAuthUser as any);

    expect(mockUsersService.findMe).toHaveBeenCalledWith('1');
  });

  it('PATCH /users/me delega en updateMe con userId y dto', async () => {
    const dto = { name: 'Nuevo Nombre' } as any;
    mockUsersService.updateMe.mockResolvedValue({ id: '1' });

    await controller.updateMe(mockAuthUser as any, dto);

    expect(mockUsersService.updateMe).toHaveBeenCalledWith('1', dto);
  });

  it('DELETE /users/me delega en removeMe con el userId del token', async () => {
    mockUsersService.removeMe.mockResolvedValue({
      message: 'Cuenta eliminada',
    });

    await controller.removeMe(mockAuthUser as any);

    expect(mockUsersService.removeMe).toHaveBeenCalledWith('1');
  });
});
