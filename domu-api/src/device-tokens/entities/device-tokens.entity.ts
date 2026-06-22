import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

@Entity({ name: 'device_tokens' })
export class DeviceTokens {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  user_id!: string;

  @Column({ type: 'text', nullable: false, unique: true })
  expo_push_token!: string;

  @Column({ type: 'varchar', nullable: false, length: 10 })
  platform!: string;
}
