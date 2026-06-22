import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DeviceTokensService } from './device-tokens.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AuthUser } from '@/auth/decorators/auth-user.decorators';
import { User } from '@/users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('device-tokens')
export class DeviceTokensController {
  constructor(private readonly service: DeviceTokensService) {}

  // Registra (o reasigna) el token de push del dispositivo del usuario actual.
  @Post()
  async register(
    @Body() dto: RegisterDeviceTokenDto,
    @AuthUser() user: User,
  ): Promise<void> {
    await this.service.register(user.id, dto.expo_push_token, dto.platform);
  }

  @Delete(':token')
  async unregister(@Param('token') token: string): Promise<void> {
    await this.service.deleteByToken(token);
  }
}
