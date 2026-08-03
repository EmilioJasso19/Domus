import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, LessThan } from 'typeorm';
import { DeviceTokensService } from './device-tokens.service';
import { DeviceTokens } from './entities/device-tokens.entity';

describe('DeviceTokensService', () => {
  let service: DeviceTokensService;

  // Cadena del query builder del DELETE de desalojo dentro de la transacción.
  const deleteQb = {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const txRepo = {
    createQueryBuilder: jest.fn(() => deleteQb),
    upsert: jest.fn(),
  };
  const repo = {
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn((cb: (m: unknown) => unknown) =>
        cb({ getRepository: () => txRepo }),
      ),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    deleteQb.delete.mockReturnThis();
    deleteQb.where.mockReturnThis();
    deleteQb.andWhere.mockReturnThis();
    deleteQb.execute.mockResolvedValue({ affected: 0 });

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

  it('findByUserIds resolves every recipient in a single query', async () => {
    repo.find.mockResolvedValue([]);
    await service.findByUserIds(['7', '9']);
    expect(repo.find).toHaveBeenCalledTimes(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { user_id: In(['7', '9']) },
    });
  });

  it('findByUserIds short-circuits on an empty list', async () => {
    await expect(service.findByUserIds([])).resolves.toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('findByUserId delegates to findByUserIds', async () => {
    repo.find.mockResolvedValue([]);
    await service.findByUserId('7');
    expect(repo.find).toHaveBeenCalledWith({ where: { user_id: In(['7']) } });
  });

  it('registerOrTouch evicts the token from other devices/users first', async () => {
    await service.registerOrTouch('7', {
      deviceId: 'device-1',
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'ios',
    });

    expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(deleteQb.where).toHaveBeenCalledWith(
      'expo_push_token = :expoPushToken',
      { expoPushToken: 'ExponentPushToken[abc]' },
    );
    expect(deleteQb.andWhere).toHaveBeenCalledWith(
      'NOT (user_id = :userId AND device_id = :deviceId)',
      { userId: '7', deviceId: 'device-1' },
    );
  });

  it('registerOrTouch upserts on (user_id, device_id) and refreshes last_seen_at', async () => {
    await service.registerOrTouch('7', {
      deviceId: 'device-1',
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'ios',
    });

    expect(txRepo.upsert).toHaveBeenCalledTimes(1);
    const [values, options] = txRepo.upsert.mock.calls[0] as [
      Record<string, unknown>,
      { conflictPaths: string[] },
    ];
    expect(values).toMatchObject({
      user_id: '7',
      device_id: 'device-1',
      expo_push_token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
    expect(values.last_seen_at).toBeInstanceOf(Date);
    expect(values.updated_at).toBeInstanceOf(Date);
    expect(options.conflictPaths).toEqual(['user_id', 'device_id']);
  });

  it('markSuccess stamps last_success_at for the accepted tokens', async () => {
    await service.markSuccess(['ExponentPushToken[abc]']);
    expect(repo.update).toHaveBeenCalledWith(
      { expo_push_token: In(['ExponentPushToken[abc]']) },
      { last_success_at: expect.any(Date) },
    );
  });

  it('markSuccess short-circuits on an empty list', async () => {
    await service.markSuccess([]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('deleteStale removes devices unseen since the cutoff and reports the count', async () => {
    const before = new Date('2026-01-01T00:00:00Z');
    repo.delete.mockResolvedValue({ affected: 3 });
    await expect(service.deleteStale(before)).resolves.toBe(3);
    expect(repo.delete).toHaveBeenCalledWith({
      last_seen_at: LessThan(before),
    });
  });

  it('purgeStaleDevices corta por el TTL por defecto (60 días)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01T00:00:00Z'));
    repo.delete.mockResolvedValue({ affected: 2 });

    await expect(service.purgeStaleDevices()).resolves.toBe(2);

    const criteria = repo.delete.mock.calls[0][0] as {
      last_seen_at: { value: Date };
    };
    // 60 días antes del "ahora" simulado.
    expect(criteria.last_seen_at).toEqual(
      LessThan(new Date('2025-12-31T00:00:00Z')),
    );
    jest.useRealTimers();
  });

  it('deleteByUserAndToken scopes the delete to the owner', async () => {
    await service.deleteByUserAndToken('7', 'ExponentPushToken[abc]');
    expect(repo.delete).toHaveBeenCalledWith({
      user_id: '7',
      expo_push_token: 'ExponentPushToken[abc]',
    });
  });

  it('deleteByToken removes by token (limpieza del sistema)', async () => {
    await service.deleteByToken('ExponentPushToken[abc]');
    expect(repo.delete).toHaveBeenCalledWith({
      expo_push_token: 'ExponentPushToken[abc]',
    });
  });
});
