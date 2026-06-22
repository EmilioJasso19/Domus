import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeviceTokensService } from './device-tokens.service';
import { DeviceTokens } from './entities/device-tokens.entity';

describe('DeviceTokensService', () => {
  let service: DeviceTokensService;
  const repo = {
    find: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokensService,
        { provide: getRepositoryToken(DeviceTokens), useValue: repo },
      ],
    }).compile();

    service = module.get<DeviceTokensService>(DeviceTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByUserId queries by user_id', async () => {
    repo.find.mockResolvedValue([]);
    await service.findByUserId('7');
    expect(repo.find).toHaveBeenCalledWith({ where: { user_id: '7' } });
  });

  it('register upserts on the unique token column', async () => {
    await service.register('7', 'ExponentPushToken[abc]', 'ios');
    expect(repo.upsert).toHaveBeenCalledWith(
      {
        expo_push_token: 'ExponentPushToken[abc]',
        user_id: '7',
        platform: 'ios',
      },
      ['expo_push_token'],
    );
  });

  it('deleteByToken removes by token', async () => {
    await service.deleteByToken('ExponentPushToken[abc]');
    expect(repo.delete).toHaveBeenCalledWith({
      expo_push_token: 'ExponentPushToken[abc]',
    });
  });
});
