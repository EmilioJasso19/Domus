import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from '@/tasks/entities/task.entity';
import { User } from '@/users/entities/user.entity';

/**
 * Instancia concreta de una tarea recurrente. La unidad que se ASIGNA y se
 * COMPLETA es la ocurrencia, no la tarea (que es solo la plantilla).
 */
@Entity({ name: 'task_occurrences' })
export class TaskOccurrence {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @ManyToOne(() => Task, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ name: 'task_id', type: 'bigint', nullable: false })
  task_id!: string;

  // Miembro responsable. Null = sin asignar todavía.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  user_id?: string | null;

  @Column({ type: 'date', nullable: false })
  due_date!: string;

  @Column({ type: 'time', nullable: true })
  due_time?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at?: Date | null;

  @Column({ type: 'boolean', default: false })
  reminder_sent!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
