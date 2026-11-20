import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import * as argon2 from 'argon2';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { MailService } from '@/common/mail/mail.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_CODE_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minuto

function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateResetCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// HMAC con secreto (no SHA-256 simple): con solo 10^6 códigos posibles, un hash
// sin clave se revertiría por fuerza bruta si se filtra la tabla.
function hashResetCode(code: string): string {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('PASSWORD_RESET_SECRET no está configurada');
  }
  return createHmac('sha256', secret).update(code).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly userHomeRoleService: UserHomeRoleService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetCode)
    private readonly passwordResetCodeRepository: Repository<PasswordResetCode>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  private signAccessToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email },
      { secret: process.env.JWT_SECRET! },
    );
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = generateRefreshToken();
    const refreshToken = this.refreshTokenRepository.create({
      token_hash: hashToken(token),
      user_id: userId,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findByEmail(signInDto.email);

    if (!user || !(await argon2.verify(user.password, signInDto.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const households = await this.userHomeRoleService.findAll(user.id);

    return {
      access_token: this.signAccessToken(user.id, user.email),
      refresh_token: await this.issueRefreshToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      households: households.map((h) => ({
        id: h.home.id,
        name: h.home.name,
        points: h.home.points,
        invitation_code: h.home.invitation_code,
      })),
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const user = await this.usersService.create(signUpDto);

    const { password, ...userWithoutPassword } = user;

    return {
      access_token: this.signAccessToken(user.id, user.email),
      refresh_token: await this.issueRefreshToken(user.id),
      user: userWithoutPassword,
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.refreshTokenRepository.findOneBy({
      token_hash: hashToken(refreshToken),
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rota primero: el token usado deja de servir aunque falle lo que sigue.
    await this.refreshTokenRepository.delete({ id: stored.id });

    if (stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = await this.usersService.findOne(stored.user_id);

    return {
      access_token: this.signAccessToken(user.id, user.email),
      refresh_token: await this.issueRefreshToken(user.id),
    };
  }

  async logout(userId: string) {
    await this.refreshTokenRepository.delete({ user_id: userId });
    return { message: 'Sesión cerrada' };
  }

  async purgeExpiredRefreshTokens() {
    await this.refreshTokenRepository.delete({
      expires_at: LessThan(new Date()),
    });
  }

  async purgeExpiredResetCodes() {
    await this.passwordResetCodeRepository.delete({
      expires_at: LessThan(new Date()),
    });
  }

  // Responde siempre lo mismo, exista o no la cuenta, para no revelar qué
  // correos están registrados.
  async requestResetPassword(requestResetPasswordDto: RequestResetPasswordDto) {
    const response = {
      message: 'Si el correo está registrado, te enviamos un código.',
    };

    const user = await this.usersService.findByEmailInsensitive(
      requestResetPasswordDto.email,
    );
    if (!user) {
      return response;
    }

    // Enfriamiento por usuario: evita usar el endpoint para inundar un buzón
    // (el throttle por IP no lo impide si el atacante rota IPs).
    const existing = await this.passwordResetCodeRepository.findOneBy({
      user_id: user.id,
    });
    if (
      existing &&
      Date.now() - existing.created_at.getTime() < RESET_CODE_RESEND_COOLDOWN_MS
    ) {
      return response;
    }

    // Un único código activo por usuario: pedir uno nuevo invalida el anterior.
    const code = generateResetCode();
    await this.passwordResetCodeRepository.upsert(
      {
        user_id: user.id,
        code_hash: hashResetCode(code),
        attempts: 0,
        expires_at: new Date(Date.now() + RESET_CODE_TTL_MS),
        created_at: new Date(),
      },
      ['user_id'],
    );

    // Sin await: el tiempo de respuesta no depende de si la cuenta existe ni
    // de la latencia de Resend. Los fallos se registran (sin el correo, que es
    // PII) y el DiscordLogger los reenvía.
    void this.mailService
      .sendPasswordResetCode(
        user.email,
        user.name,
        code,
        RESET_CODE_TTL_MS / 60_000,
      )
      .catch((error: unknown) => {
        this.logger.error(
          `No se pudo enviar el correo de recuperación (user ${user.id})`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return response;
  }

  // Un único mensaje para cualquier fallo (cuenta inexistente, sin código,
  // expirado, agotado o incorrecto), para no filtrar información.
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const invalid = () => new BadRequestException('Código inválido o expirado');

    const user = await this.usersService.findByEmailInsensitive(
      resetPasswordDto.email,
    );
    if (!user) {
      throw invalid();
    }

    const stored = await this.passwordResetCodeRepository.findOneBy({
      user_id: user.id,
    });
    if (!stored) {
      throw invalid();
    }

    if (
      stored.expires_at < new Date() ||
      stored.attempts >= RESET_CODE_MAX_ATTEMPTS
    ) {
      await this.passwordResetCodeRepository.delete({ id: stored.id });
      throw invalid();
    }

    if (!safeEqualHex(stored.code_hash, hashResetCode(resetPasswordDto.code))) {
      // Incremento atómico en la BD; al agotar los intentos el código muere y
      // hay que pedir otro.
      await this.passwordResetCodeRepository.increment(
        { id: stored.id },
        'attempts',
        1,
      );
      if (stored.attempts + 1 >= RESET_CODE_MAX_ATTEMPTS) {
        await this.passwordResetCodeRepository.delete({ id: stored.id });
      }
      throw invalid();
    }

    await this.dataSource.transaction(async (manager) => {
      await this.usersService.setPassword(
        user.id,
        resetPasswordDto.new_password,
        manager,
      );
      await manager.delete(PasswordResetCode, { id: stored.id });
      // Cierra la sesión en todos los dispositivos: si alguien más tenía
      // acceso a la cuenta, lo pierde junto con la contraseña anterior.
      await manager.delete(RefreshToken, { user_id: user.id });
    });

    return { message: 'Contraseña actualizada' };
  }
}
