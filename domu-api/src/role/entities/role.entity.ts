import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RoleName } from '../constants/roles.constants';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: false })
  name!: RoleName;

  @Column({ type: 'text', nullable: true })
  description!: string;
}
