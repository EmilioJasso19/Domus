import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { FrequencyType } from '../enums/frequency-type.enum';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  responsible_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({
    type: 'enum',
    enum: FrequencyType,
    enumName: 'frequency_type_enum',
  })
  frequency_type: FrequencyType;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  // TODO: timestampz completed_at
  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'boolean', default: false })
  is_strict: boolean;

  @Column({ type: 'text', nullable: true })
  evidence_path: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date;
}
