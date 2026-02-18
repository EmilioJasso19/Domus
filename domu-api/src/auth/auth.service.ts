import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findByEmail(signInDto.email);
    
    if (!user || !(await argon2.verify(user.password, signInDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET! }),
      user: { 
        id: user.id, 
        email: user.email,
        name: user.name,
      },
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const user = await this.usersService.create(signUpDto);
    
    const { password, ...userWithoutPassword } = user;
    
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload, { secret: process.env.JWT_SECRET! });
    
    return {
      access_token,
      user: userWithoutPassword
    };
  }
}