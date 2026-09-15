import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import * as argon2 from 'argon2';
import { UserHomeRoleService } from '@/user-home-role/user-home-role.service';
import { RefreshToken } from './entities/refresh-token.entity';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly userHomeRoleService: UserHomeRoleService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
}
