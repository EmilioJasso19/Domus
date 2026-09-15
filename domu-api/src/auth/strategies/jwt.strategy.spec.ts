import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '@/users/users.service';

const mockUsersService = {
  findOne: jest.fn(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('valida el token y retorna { id, email }', async () => {
    mockUsersService.findOne.mockResolvedValue({
      id: '1',
      email: 'emilio@example.com',
      name: 'Emilio',
      password: 'hash',
    });

    const result = await strategy.validate({
      sub: '1',
      email: 'emilio@example.com',
    });

    expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1', email: 'emilio@example.com' });
  });

  it('lanza UnauthorizedException si el usuario ya no existe', async () => {
    mockUsersService.findOne.mockRejectedValue(new Error('User not found'));

    await expect(
      strategy.validate({ sub: '999', email: 'x@example.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
