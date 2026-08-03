import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceTokens } from './entities/device-tokens.entity';
import { DeviceTokensService } from './device-tokens.service';
import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensCron } from './device-tokens.cron';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceTokens]), AuthModule],
  providers: [DeviceTokensService, DeviceTokensCron],
  controllers: [DeviceTokensController],
  exports: [DeviceTokensService],
})
export class DeviceTokensModule {}
