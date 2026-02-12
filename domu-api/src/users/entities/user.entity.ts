import { Home } from 'src/home/entities/home.entity';
import { Entity, Column, PrimaryGeneratedColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Roles } from '../enums/roles.enums';

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @ManyToOne(() => Home, { nullable: true })
    @JoinColumn({ name: 'home_id' })
    @Column({ select: true , nullable: true })
    home_id: string;

    @Column({ type: 'enum', enum: Roles, enumName: 'roles_enum', default: Roles.GUEST })
    role: Roles;

    @Column({ type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    paternal_surname: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    maternal_surname: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    email: string;

    @Column({ type: 'text', nullable: false, select: false })
    password: string;

    @Column({ type: 'date', nullable: false })
    birth_date: Date;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true, default: null })
    deleted_at: Date;
}
