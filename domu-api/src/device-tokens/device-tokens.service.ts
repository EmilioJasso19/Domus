import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { subDays } from 'date-fns';
import { In, LessThan, Repository } from 'typeorm';
import { DeviceTokens } from './entities/device-tokens.entity';

// Días sin señales tras los que un dispositivo se considera abandonado.
const STALE_DEVICE_TTL_DAYS = Number(process.env.DEVICE_TOKEN_TTL_DAYS) || 60;

export interface RegisterDeviceInput {
  deviceId: string;
  expoPushToken: string;
  platform: string;
}

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(
    @InjectRepository(DeviceTokens)
    private readonly repo: Repository<DeviceTokens>,
  ) {}

  async findByUserId(userId: string): Promise<DeviceTokens[]> {
    return this.findByUserIds([userId]);
  }

  // Una sola consulta para todos los destinatarios: el envío de notificaciones
  // resuelve hogares completos y antes hacía una query por usuario (N+1).
  async findByUserIds(userIds: string[]): Promise<DeviceTokens[]> {
    if (userIds.length === 0) return [];
    return this.repo.find({ where: { user_id: In(userIds) } });
  }

  /**
   * Alta o "latido" de un dispositivo. Idempotente por (user_id, device_id):
   * si el dispositivo ya existe actualiza el token (que rota con reinstalaciones
   * y re-registros de FCM/APNs) y refresca last_seen_at; si no, lo crea.
   *
   * Antes del upsert desaloja el mismo expo_push_token en manos de otro par
   * (usuario, dispositivo): un token identifica una instalación concreta, así
   * que si reaparece bajo otra cuenta es que el dispositivo cambió de dueño y el
   * registro anterior ya no debe recibir nada. Sin esto, dos cuentas que
   * compartan teléfono se filtrarían notificaciones entre sí.
   *
   * Ambos pasos van en una transacción para que no quede una ventana en la que
   * el token no pertenece a nadie.
   */
  async registerOrTouch(
    userId: string,
    { deviceId, expoPushToken, platform }: RegisterDeviceInput,
  ): Promise<void> {
    const now = new Date();

    await this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(DeviceTokens);

      const evicted = await repo
        .createQueryBuilder()
        .delete()
        .where('expo_push_token = :expoPushToken', { expoPushToken })
        .andWhere('NOT (user_id = :userId AND device_id = :deviceId)', {
          userId,
          deviceId,
        })
        .execute();

      if (evicted.affected) {
        this.logger.log(
          `Token reasignado: se liberaron ${evicted.affected} registro(s) previos del dispositivo ${deviceId}`,
        );
      }

      // updated_at se escribe a mano: el onUpdate del entity solo lo emite
      // TypeORM en MySQL, en Postgres no existe tal cláusula.
      await repo.upsert(
        {
          user_id: userId,
          device_id: deviceId,
          expo_push_token: expoPushToken,
          platform,
          last_seen_at: now,
          updated_at: now,
        },
        { conflictPaths: ['user_id', 'device_id'] },
      );
    });
  }

  // Marca los tokens que Expo aceptó para entrega. Es la señal de "este
  // dispositivo sigue vivo" más fiable que last_seen_at, que depende de que la
  // app se abra.
  async markSuccess(expoPushTokens: string[]): Promise<void> {
    if (expoPushTokens.length === 0) return;
    await this.repo.update(
      { expo_push_token: In(expoPushTokens) },
      { last_success_at: new Date() },
    );
  }

  // Borra dispositivos que no dan señales desde antes de `before`. Devuelve el
  // número de filas eliminadas para que quien llame lo registre.
  async deleteStale(before: Date): Promise<number> {
    const result = await this.repo.delete({ last_seen_at: LessThan(before) });
    return result.affected ?? 0;
  }

  /**
   * Limpieza periódica de dispositivos muertos (la invoca DeviceTokensCron).
   *
   * Hace falta porque los tickets de Expo solo detectan una parte de las bajas:
   * un teléfono perdido, formateado o con la app desinstalada puede seguir
   * devolviendo tickets 'ok' un tiempo. last_seen_at, en cambio, solo se refresca
   * cuando la app se abre de verdad, así que es la señal fiable de abandono.
   */
  async purgeStaleDevices(): Promise<number> {
    const cutoff = subDays(new Date(), STALE_DEVICE_TTL_DAYS);
    const removed = await this.deleteStale(cutoff);

    if (removed > 0) {
      this.logger.log(
        `Limpieza de dispositivos: ${removed} eliminado(s) sin actividad desde ${cutoff.toISOString()}`,
      );
    }
    return removed;
  }

  // Baja iniciada por el usuario (p.ej. logout). Va acotada al user_id
  // autenticado: sin ese filtro cualquiera podría desregistrar el dispositivo de
  // otra persona conociendo su token y dejarla sin notificaciones.
  async deleteByUserAndToken(
    userId: string,
    expoPushToken: string,
  ): Promise<void> {
    await this.repo.delete({ user_id: userId, expo_push_token: expoPushToken });
  }

  // Baja iniciada por el sistema: solo para limpiar tokens que Expo reporta como
  // no registrados, donde no hay usuario autenticado en contexto.
  async deleteByToken(expoPushToken: string): Promise<void> {
    await this.repo.delete({ expo_push_token: expoPushToken });
  }
}
