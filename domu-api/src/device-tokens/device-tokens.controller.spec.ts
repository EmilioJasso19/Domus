import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensService } from './device-tokens.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/users/entities/user.entity';

describe('DeviceTokensController', () => {
  let controller: DeviceTokensController;
  const service = {
    register: jest.fn(),
    deleteByToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTokensController],
      providers: [{ provide: DeviceTokensService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeviceTokensController>(DeviceTokensController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delegates to the service with the auth user id', async () => {
    await controller.register(
      { expo_push_token: 'ExponentPushToken[abc]', platform: 'ios' },
      { id: '7' } as User,
    );
    expect(service.register).toHaveBeenCalledWith(
      '7',
      'ExponentPushToken[abc]',
      'ios',
    );
  });

  it('unregister delegates to the service', async () => {
    await controller.unregister('ExponentPushToken[abc]');
    expect(service.deleteByToken).toHaveBeenCalledWith('ExponentPushToken[abc]');
  });
});
