import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

// Nunca se guarda el refresh token en claro, solo el hash SHA-256 (columna
// única) — así una fuga de la tabla no permite reutilizarlos directamente.
@Entity({ name: 'refresh_tokens' })
@Index('IDX_refresh_tokens_expires_at', ['expires_at'])
export class RefreshToken {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token_hash!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'bigint' })
  user_id!: string;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
