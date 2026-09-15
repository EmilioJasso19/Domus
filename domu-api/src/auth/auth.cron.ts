import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

@Injectable()
export class AuthCron {
  constructor(private readonly authService: AuthService) { }

  // Una vez al día, de madrugada: delega toda la lógica en el servicio. No es
  // urgente ni sensible a la hora exacta, solo evita que la tabla crezca con
  // refresh tokens que ya vencieron.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: APP_TIMEZONE })
  async handleExpiredRefreshTokens(): Promise<void> {
    const purgeExpiredRefreshTokens = (
      this.authService as unknown as {
        purgeExpiredRefreshTokens: () => Promise<void>;
      }
    ).purgeExpiredRefreshTokens;

    await purgeExpiredRefreshTokens.call(this.authService);
  }
}
