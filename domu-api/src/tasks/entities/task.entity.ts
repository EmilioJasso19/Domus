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
import { Home } from '@/home/entities/home.entity';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  // @ManyToOne(() => User, { nullable: true })
  // @JoinColumn({ name: 'responsible_id' })
  // responsible!: User;

  // @Column({ name: 'responsible_id', type: 'bigint', nullable: true })
  // responsible_id!: string;

  @ManyToOne(() => Home, { nullable: false })
  @JoinColumn({ name: 'home_id' })
  home!: Home;

  @Column({ name: 'home_id', type: 'bigint', nullable: false })
  home_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'integer', nullable: false, default: 1 })
  physical_effort!: number;

  // @Column({ type: 'date' })
  // due_date!: Date;

  @Column({
    type: 'enum',
    enum: FrequencyType,
    enumName: 'frequency_type_enum',
  })
  frequency_type!: FrequencyType;

  // TODO: physical effort column

  // @Column({ type: 'timestamptz', nullable: true })
  // completed_at?: Date | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true, default: null })
  deleted_at?: Date;
}
