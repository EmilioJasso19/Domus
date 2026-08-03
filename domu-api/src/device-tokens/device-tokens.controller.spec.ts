import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensService } from './device-tokens.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/users/entities/user.entity';

describe('DeviceTokensController', () => {
  let controller: DeviceTokensController;
  const service = {
    registerOrTouch: jest.fn(),
    deleteByUserAndToken: jest.fn(),
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
      {
        device_id: 'device-1',
        expo_push_token: 'ExponentPushToken[abc]',
        platform: 'ios',
      },
      { id: '7' } as User,
    );
    expect(service.registerOrTouch).toHaveBeenCalledWith('7', {
      deviceId: 'device-1',
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
  });

  it('unregister only removes the token of the auth user', async () => {
    await controller.unregister('ExponentPushToken[abc]', { id: '7' } as User);
    expect(service.deleteByUserAndToken).toHaveBeenCalledWith(
      '7',
      'ExponentPushToken[abc]',
    );
  });
});
