import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import { Home } from '@/home/entities/home.entity';
import { Role } from '@/role/entities/role.entity';

@Entity({ name: 'user_home_roles' })
export class UserHomeRole {
    @PrimaryColumn({ type: 'bigint' })
    user_id: string;

    @PrimaryColumn({ type: 'bigint' })
    home_id: string;

    @Column({ type: 'bigint', nullable: false })
    role_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Home, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'home_id' })
    home: Home;

    @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
        nullable: false
    })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true, default: null })
    deleted_at: Date;
}