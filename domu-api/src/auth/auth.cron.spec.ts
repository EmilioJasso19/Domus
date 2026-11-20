import { Test, TestingModule } from '@nestjs/testing';
import { AuthCron } from './auth.cron';
import { AuthService } from './auth.service';

const mockAuthService = {
  purgeExpiredRefreshTokens: jest.fn(),
  purgeExpiredResetCodes: jest.fn(),
};

describe('AuthCron', () => {
  let cron: AuthCron;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCron,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    cron = module.get<AuthCron>(AuthCron);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  it('delega la limpieza de refresh tokens expirados en AuthService', async () => {
    mockAuthService.purgeExpiredRefreshTokens.mockResolvedValue(undefined);

    await cron.handleExpiredRefreshTokens();

    expect(mockAuthService.purgeExpiredRefreshTokens).toHaveBeenCalledTimes(1);
  });

  it('delega la limpieza de códigos de recuperación expirados en AuthService', async () => {
    mockAuthService.purgeExpiredResetCodes.mockResolvedValue(undefined);

    await cron.handleExpiredResetCodes();

    expect(mockAuthService.purgeExpiredResetCodes).toHaveBeenCalledTimes(1);
  });
});
