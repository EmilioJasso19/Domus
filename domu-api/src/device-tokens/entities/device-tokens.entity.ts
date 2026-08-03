import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

// Un registro por (usuario, dispositivo). El expo_push_token es rotativo —
// cambia al reinstalar, al restaurar en un teléfono nuevo o cuando FCM/APNs
// vuelven a registrar la app— así que la identidad estable es device_id, no el
// token. Por eso el UNIQUE compuesto (user_id, device_id) es el conflict target
// del upsert de registro.
//
// El UNIQUE de expo_push_token se conserva a propósito: garantiza que un mismo
// dispositivo físico no quede reclamado por dos cuentas a la vez (si el mismo
// token reaparece con otro usuario, el registro desaloja al anterior). Sin él,
// dos cuentas que compartan teléfono recibirían las notificaciones de la otra.
@Entity({ name: 'device_tokens' })
@Unique('UQ_device_tokens_user_device', ['user_id', 'device_id'])
@Index('IDX_device_tokens_user_id', ['user_id'])
@Index('IDX_device_tokens_last_seen_at', ['last_seen_at'])
export class DeviceTokens {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  user_id!: string;

  // Identificador estable de la instalación, generado y persistido en el
  // dispositivo. Sobrevive a los cambios de expo_push_token.
  @Column({ type: 'varchar', nullable: false, length: 64 })
  device_id!: string;

  @Column({ type: 'text', nullable: false, unique: true })
  expo_push_token!: string;

  @Column({ type: 'varchar', nullable: false, length: 10 })
  platform!: string;

  // Última vez que la app reportó este dispositivo (arranque o vuelta a primer
  // plano). Es la señal que usa la limpieza automática de dispositivos muertos.
  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  last_seen_at!: Date;

  // Último envío que Expo aceptó para entrega en este token. Null mientras no se
  // haya enviado nada todavía.
  @Column({ type: 'timestamptz', nullable: true, default: null })
  last_success_at?: Date | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  created_at!: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  updated_at!: Date;
}
