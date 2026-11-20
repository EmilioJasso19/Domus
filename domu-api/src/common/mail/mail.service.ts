import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { passwordResetTemplate } from './templates/password-reset';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: Resend | null = null;

  // Se leen en cada llamada (no en el constructor) para no depender del orden
  // de carga de ConfigModule, igual que DiscordService.
  private get apiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private get from(): string {
    return process.env.MAIL_FROM || 'Domus <onboarding@resend.dev>';
  }

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(this.apiKey);
    }
    return this.client;
  }

  async sendPasswordResetCode(
    to: string,
    name: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV !== 'production') {
        // Desarrollo sin Resend configurado: el código se imprime en consola
        // para poder probar el flujo. Nunca se registra el correo (PII).
        // this.logger.log(`[mail] password reset code: ${code}`);
        return;
      }
      throw new Error('RESEND_API_KEY no está configurada');
    }

    const { subject, html, text } = passwordResetTemplate({
      name,
      code,
      expiresInMinutes,
    });

    const { error } = await this.getClient().emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      throw new Error(`Resend error (${error.name}): ${error.message}`);
    }
  }
}
