import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { MailService } from '@/common/mail/mail.service';
import { DataSource } from 'typeorm';
import { createHmac } from 'crypto';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUser = {
  id: 1,
  name: 'Emilio',
  paternal_surname: 'Jasso',
  email: 'emilio@example.com',
  password: 'hashed_password',
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findByEmailInsensitive: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  setPassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
};

// signIn() consulta los hogares del usuario; por defecto devolvemos lista vacía.
const mockUserHomeRoleService = {
  findAll: jest.fn().mockResolvedValue([]),
};

const mockRefreshTokenRepository = {
  create: jest.fn((data: any) => data),
  save: jest.fn(),
  findOneBy: jest.fn(),
  delete: jest.fn(),
};

const mockPasswordResetCodeRepository = {
  findOneBy: jest.fn(),
  upsert: jest.fn(),
  increment: jest.fn(),
  delete: jest.fn(),
};

const mockMailService = {
  sendPasswordResetCode: jest.fn(),
};

const mockManager = {
  delete: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: typeof mockManager) => unknown) =>
    cb(mockManager),
  ),
};

const RESET_SECRET = 'test-reset-secret';

function hmac(code: string) {
  return createHmac('sha256', RESET_SECRET).update(code).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserHomeRoleService, useValue: mockUserHomeRoleService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetCode),
          useValue: mockPasswordResetCodeRepository,
        },
        { provide: MailService, useValue: mockMailService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    mockRefreshTokenRepository.create.mockImplementation((data: any) => data);
    mockRefreshTokenRepository.save.mockResolvedValue({});
    mockMailService.sendPasswordResetCode.mockResolvedValue(undefined);
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: typeof mockManager) => unknown) => cb(mockManager),
    );
    process.env.PASSWORD_RESET_SECRET = RESET_SECRET;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // C01 – Registro exitoso
  describe('C01 - Registro exitoso', () => {
    it('debe retornar access_token, refresh_token y objeto user sin la contraseña (HTTP 201)', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const signUpDto = {
        name: 'Emilio',
        paternal_surname: 'Jasso',
        email: 'emilio@example.com',
        password: 'Minimo#8',
      };

      const result = await service.signUp(signUpDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(signUpDto);
      expect(result).toHaveProperty('access_token', 'mock_jwt_token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
      // La contraseña NO debe estar en la respuesta
      expect(result.user).not.toHaveProperty('password');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  // C02 – Registro con correo ya existente
  describe('C02 - Registro con correo ya existente', () => {
    it('debe propagar ConflictException (HTTP 409) cuando UsersService.create la lanza', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('El correo ya está en uso'),
      );

      await expect(
        service.signUp({
          name: 'Emilio',
          paternal_surname: 'Jasso',
          email: 'emilio@example.com',
          password: 'Minimo#8',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('el mensaje debe indicar que el correo ya está en uso', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('El correo ya está en uso'),
      );

      await expect(
        service.signUp({
          name: 'Emilio',
          paternal_surname: 'Jasso',
          email: 'emilio@example.com',
          password: 'Minimo#8',
        }),
      ).rejects.toThrow(/correo|email/i);
    });
  });

  // C03 – Registro con contraseña inválida (sin caracteres especiales)
  describe('C03 - Registro con contraseña inválida', () => {
    it('debe propagar BadRequestException (HTTP 400) cuando UsersService.create la lanza', async () => {
      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Error de validación en el campo password'),
      );

      await expect(
        service.signUp({
          name: 'Emilio',
          paternal_surname: 'Jasso',
          email: 'emilio@example.com',
          password: 'SinEspecial1', // contraseña sin carácter especial
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('el mensaje debe hacer referencia al campo password', async () => {
      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Error de validación en el campo password'),
      );

      await expect(
        service.signUp({
          name: 'Emilio',
          paternal_surname: 'Jasso',
          email: 'emilio@example.com',
          password: 'SinEspecial1',
        }),
      ).rejects.toThrow(/password|contraseña/i);
    });
  });

  // C06 – Campos requeridos vacíos
  describe('C06 - Campos requeridos vacíos', () => {
    it('debe propagar BadRequestException cuando un campo requerido está vacío', async () => {
      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Error de validación en el campo name'),
      );

      await expect(
        service.signUp({
          name: '',
          paternal_surname: 'Jasso',
          email: 'emilio@example.com',
          password: 'Minimo#8',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // C07 – Email con formato inválido
  describe('C07 - Registro con email inválido', () => {
    it('debe propagar BadRequestException cuando el email tiene formato inválido', async () => {
      mockUsersService.create.mockRejectedValue(
        new BadRequestException('Error de validación en el campo email'),
      );

      await expect(
        service.signUp({
          name: 'Emilio',
          paternal_surname: 'Jasso',
          email: 'noesuncorreo',
          password: 'Minimo#8',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // C04 – Inicio de sesión con credenciales correctas
  describe('C04 - Inicio de sesión con credenciales correctas', () => {
    it('debe retornar access_token, refresh_token y objeto user (HTTP 200)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const signInDto = {
        email: 'emilio@example.com',
        password: 'Minimo#8',
      };

      const result = await service.signIn(signInDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        signInDto.password,
      );
      expect(result).toHaveProperty('access_token', 'mock_jwt_token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  // C05 – Inicio de sesión con contraseña incorrecta
  describe('C05 - Inicio de sesión con contraseña incorrecta', () => {
    it('debe lanzar UnauthorizedException (HTTP 401) cuando la contraseña no coincide', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false); // hash no coincide

      await expect(
        service.signIn({
          email: 'emilio@example.com',
          password: 'Incorrecto#9',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException (HTTP 401) cuando el correo no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null); // usuario no encontrado

      await expect(
        service.signIn({
          email: 'noexiste@example.com',
          password: 'Minimo#8',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('el mensaje debe indicar credenciales inválidas', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn({
          email: 'emilio@example.com',
          password: 'Incorrecto#9',
        }),
      ).rejects.toThrow(/credenciales/i);
    });
  });

  describe('refreshTokens', () => {
    const storedToken = {
      id: '50',
      token_hash: 'any-hash',
      user_id: '1',
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // +1h, vigente
    };

    it('con token válido retorna un nuevo par de tokens', async () => {
      mockRefreshTokenRepository.findOneBy.mockResolvedValue(storedToken);
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 1 });
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshTokens('some-raw-refresh-token');

      expect(result).toHaveProperty('access_token', 'mock_jwt_token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
    });

    it('con token inválido lanza UnauthorizedException', async () => {
      mockRefreshTokenRepository.findOneBy.mockResolvedValue(null);

      await expect(service.refreshTokens('no-existe')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('con token expirado lanza UnauthorizedException', async () => {
      mockRefreshTokenRepository.findOneBy.mockResolvedValue({
        ...storedToken,
        expires_at: new Date(Date.now() - 60 * 1000), // -1min, ya expiró
      });
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.refreshTokens('expirado')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rota el token: elimina el usado antes de emitir uno nuevo', async () => {
      mockRefreshTokenRepository.findOneBy.mockResolvedValue(storedToken);
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 1 });
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await service.refreshTokens('some-raw-refresh-token');

      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith({
        id: storedToken.id,
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('elimina todos los refresh tokens del usuario', async () => {
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 2 });

      await service.logout('1');

      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith({
        user_id: '1',
      });
    });

    it('es idempotente cuando el usuario no tiene tokens', async () => {
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.logout('1')).resolves.not.toThrow();
    });
  });

  describe('purgeExpiredRefreshTokens', () => {
    it('elimina solo los refresh tokens expirados', async () => {
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 3 });

      await service.purgeExpiredRefreshTokens();

      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith({
        expires_at: expect.objectContaining({ type: 'lessThan' }),
      });
    });
  });

  describe('requestResetPassword', () => {
    const genericMessage = {
      message: 'Si el correo está registrado, te enviamos un código.',
    };

    it('con correo no registrado responde el mensaje genérico y no envía correo', async () => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(null);

      const result = await service.requestResetPassword({
        email: 'nadie@example.com',
      });

      expect(result).toEqual(genericMessage);
      expect(mockPasswordResetCodeRepository.upsert).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('con correo registrado guarda el HMAC del código y envía el correo', async () => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(mockUser);
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue(null);

      const result = await service.requestResetPassword({
        email: mockUser.email,
      });

      expect(result).toEqual(genericMessage);
      expect(mockMailService.sendPasswordResetCode).toHaveBeenCalledTimes(1);
      const [to, name, code, minutes] =
        mockMailService.sendPasswordResetCode.mock.calls[0];
      expect(to).toBe(mockUser.email);
      expect(name).toBe(mockUser.name);
      expect(code).toMatch(/^\d{6}$/);
      expect(minutes).toBe(15);

      const [row, conflictPaths] =
        mockPasswordResetCodeRepository.upsert.mock.calls[0];
      expect(conflictPaths).toEqual(['user_id']);
      expect(row).toMatchObject({
        user_id: mockUser.id,
        code_hash: hmac(code),
        attempts: 0,
      });
      expect(row.code_hash).not.toBe(code);
      expect(row.expires_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('no reenvía si el último código se pidió hace menos de un minuto', async () => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(mockUser);
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue({
        id: '9',
        created_at: new Date(Date.now() - 10_000),
      });

      const result = await service.requestResetPassword({
        email: mockUser.email,
      });

      expect(result).toEqual(genericMessage);
      expect(mockPasswordResetCodeRepository.upsert).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('si falla el envío del correo igual responde el mensaje genérico', async () => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(mockUser);
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue(null);
      mockMailService.sendPasswordResetCode.mockRejectedValue(
        new Error('resend down'),
      );
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.requestResetPassword({ email: mockUser.email }),
      ).resolves.toEqual(genericMessage);

      await new Promise((resolve) => setImmediate(resolve));
      expect(loggerSpy).toHaveBeenCalled();
      expect(String(loggerSpy.mock.calls[0][0])).not.toContain(mockUser.email);
    });
  });

  describe('resetPassword', () => {
    const dto = {
      email: mockUser.email,
      code: '123456',
      new_password: 'Nueva#Pass1',
    };

    const validRow = () => ({
      id: '7',
      user_id: mockUser.id,
      code_hash: hmac('123456'),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
    });

    beforeEach(() => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(mockUser);
    });

    it('con código correcto cambia la contraseña, borra el código y cierra todas las sesiones', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue(validRow());

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Contraseña actualizada' });
      expect(mockUsersService.setPassword).toHaveBeenCalledWith(
        mockUser.id,
        dto.new_password,
        mockManager,
      );
      expect(mockManager.delete).toHaveBeenCalledWith(PasswordResetCode, {
        id: '7',
      });
      expect(mockManager.delete).toHaveBeenCalledWith(RefreshToken, {
        user_id: mockUser.id,
      });
    });

    it('con correo no registrado lanza BadRequestException', async () => {
      mockUsersService.findByEmailInsensitive.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Código inválido o expirado',
      );
      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('sin código solicitado lanza BadRequestException', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('con código incorrecto incrementa los intentos y lanza BadRequestException', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue(validRow());

      await expect(
        service.resetPassword({ ...dto, code: '000000' }),
      ).rejects.toThrow('Código inválido o expirado');

      expect(mockPasswordResetCodeRepository.increment).toHaveBeenCalledWith(
        { id: '7' },
        'attempts',
        1,
      );
      expect(mockPasswordResetCodeRepository.delete).not.toHaveBeenCalled();
      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('al quinto intento fallido elimina el código', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue({
        ...validRow(),
        attempts: 4,
      });

      await expect(
        service.resetPassword({ ...dto, code: '000000' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPasswordResetCodeRepository.delete).toHaveBeenCalledWith({
        id: '7',
      });
    });

    it('con intentos agotados rechaza incluso el código correcto', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue({
        ...validRow(),
        attempts: 5,
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });

    it('con código expirado lo elimina y lanza BadRequestException', async () => {
      mockPasswordResetCodeRepository.findOneBy.mockResolvedValue({
        ...validRow(),
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPasswordResetCodeRepository.delete).toHaveBeenCalledWith({
        id: '7',
      });
      expect(mockUsersService.setPassword).not.toHaveBeenCalled();
    });
  });

  describe('purgeExpiredResetCodes', () => {
    it('elimina solo los códigos expirados', async () => {
      await service.purgeExpiredResetCodes();

      expect(mockPasswordResetCodeRepository.delete).toHaveBeenCalledWith({
        expires_at: expect.objectContaining({ type: 'lessThan' }),
      });
    });
  });
});
