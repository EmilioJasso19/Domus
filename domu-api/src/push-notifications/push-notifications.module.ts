import { Module } from '@nestjs/common';
import { DeviceTokensModule } from '@/device-tokens/device-tokens.module';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [DeviceTokensModule],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
