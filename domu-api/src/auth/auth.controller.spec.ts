import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

const mockAuthService = {
  signIn: jest.fn(),
  signUp: jest.fn(),
};

const signUpDto = {
  name: 'Emilio',
  paternal_surname: 'Jasso',
  email: 'emilio@example.com',
  password: 'Minimo#8',
};

const signInDto = {
  email: 'emilio@example.com',
  password: 'Minimo#8',
};

const authResponse = {
  access_token: 'mock_jwt_token',
  user: {
    id: 1,
    name: 'Emilio',
    email: 'emilio@example.com',
  },
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register – signUp()', () => {

    // C01 – Registro exitoso
    it('C01: debe llamar a authService.signUp y retornar access_token y user', async () => {
      mockAuthService.signUp.mockResolvedValue(authResponse);

      const result = await controller.signUp(signUpDto as any);

      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(authResponse);
      expect(result.user).not.toHaveProperty('password');
    });

    // C02 – Correo ya existente
    it('C02: debe propagar ConflictException cuando el correo ya está en uso', async () => {
      mockAuthService.signUp.mockRejectedValue(
        new ConflictException('El correo ya está en uso'),
      );

      await expect(controller.signUp(signUpDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    // C03 – Contraseña inválida
    it('C03: debe propagar BadRequestException cuando la contraseña es inválida', async () => {
      const invalidDto = { ...signUpDto, password: 'SinEspecial1' };

      mockAuthService.signUp.mockRejectedValue(
        new BadRequestException('Error de validación en el campo password'),
      );

      await expect(controller.signUp(invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    // C06 – Campos requeridos vacíos
    it('C06: debe propagar BadRequestException cuando un campo requerido está vacío', async () => {
      const emptyFieldDto = { ...signUpDto, name: '' };

      mockAuthService.signUp.mockRejectedValue(
        new BadRequestException('Error de validación en el campo name'),
      );

      await expect(controller.signUp(emptyFieldDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    // C07 – Email con formato inválido
    it('C07: debe propagar BadRequestException cuando el email tiene formato inválido', async () => {
      const invalidEmailDto = { ...signUpDto, email: 'noesuncorreo' };

      mockAuthService.signUp.mockRejectedValue(
        new BadRequestException('Error de validación en el campo email'),
      );

      await expect(controller.signUp(invalidEmailDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /auth/login
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /auth/login – signIn()', () => {

    // C04 – Credenciales correctas
    it('C04: debe llamar a authService.signIn y retornar access_token', async () => {
      mockAuthService.signIn.mockResolvedValue(authResponse);

      const result = await controller.signIn(signInDto as any);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toHaveProperty('access_token', 'mock_jwt_token');
    });

    // C05 – Contraseña incorrecta
    it('C05: debe propagar UnauthorizedException cuando las credenciales son inválidas', async () => {
      const wrongDto = { ...signInDto, password: 'Incorrecto#9' };

      mockAuthService.signIn.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(controller.signIn(wrongDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // C08 – Correo no registrado
    it('C08: debe propagar UnauthorizedException cuando el correo no está registrado', async () => {
      const unregisteredDto = { ...signInDto, email: 'noexiste@example.com' };

      mockAuthService.signIn.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(controller.signIn(unregisteredDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});