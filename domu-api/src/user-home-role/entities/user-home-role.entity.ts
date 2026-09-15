import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { Home } from '@/home/entities/home.entity';
import { Role } from '@/role/entities/role.entity';

@Entity({ name: 'user_home_roles' })
export class UserHomeRole {
  @PrimaryColumn({ type: 'bigint' })
  user_id!: string;

  @PrimaryColumn({ type: 'bigint' })
  home_id!: string;

  @Column({ type: 'bigint', nullable: false })
  role_id!: string;

  // Mapea la columna "created_at" (ya existente en la tabla desde el init,
  // sin exponer antes) como el momento en que el usuario se unió a este
  // hogar. Se usa para decidir sucesión de OWNER al eliminar cuentas.
  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joined_at!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Home, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'home_id' })
  home!: Home;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
