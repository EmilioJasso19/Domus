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

  // Alta o latido del dispositivo actual: crea el registro si es nuevo y, si ya
  // existía, actualiza el token y refresca last_seen_at.
  @Post()
  async register(
    @Body() dto: RegisterDeviceTokenDto,
    @AuthUser() user: User,
  ): Promise<void> {
    await this.service.registerOrTouch(user.id, {
      deviceId: dto.device_id,
      expoPushToken: dto.expo_push_token,
      platform: dto.platform,
    });
  }

  // Da de baja el token de ESTE dispositivo para el usuario autenticado. El
  // borrado va acotado al user_id para que nadie pueda desregistrar tokens
  // ajenos conociendo (o adivinando) el token.
  @Delete(':token')
  async unregister(
    @Param('token') token: string,
    @AuthUser() user: User,
  ): Promise<void> {
    await this.service.deleteByUserAndToken(user.id, token);
  }
}
