import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

// Código de 6 dígitos para restablecer la contraseña. Como solo hay 1,000,000
// combinaciones, nunca se guarda en claro ni con un SHA-256 simple (se
// revertiría por fuerza bruta si se filtra la tabla): se guarda un HMAC con
// PASSWORD_RESET_SECRET. Un único código activo por usuario (user_id único).
@Entity({ name: 'password_reset_codes' })
@Index('IDX_password_reset_codes_expires_at', ['expires_at'])
export class PasswordResetCode {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  code_hash!: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'bigint', unique: true })
  user_id!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
