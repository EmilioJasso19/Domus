import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceTokensService } from './device-tokens.service';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class DeviceTokensCron {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  // Una vez al día, de madrugada: delega toda la lógica en el servicio. No es
  // urgente ni sensible a la hora exacta, solo evita que la tabla crezca con
  // dispositivos que ya no existen.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: APP_TIMEZONE })
  async handleStaleDevices(): Promise<void> {
    await this.deviceTokensService.purgeStaleDevices();
  }
}
