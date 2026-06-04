import { Home } from "@/home/entities/home.entity";
import { User } from "@/users/entities/user.entity";
import { ManyToOne, PrimaryGeneratedColumn, Column, Entity, Unique, JoinColumn } from "typeorm";
import { Days } from "../enums/days.enums";
import { UserHomeRole } from "@/user-home-role/entities/user-home-role.entity";

@Entity({ name: 'blocked_schedules' })
@Unique('uq_blocked_schedule', ['user_id', 'home_id', 'day', 'start_time'])
export class BlockedSchedule {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id!: string;

    @Column({ name: 'user_id', type: 'bigint', nullable: false })
    user_id!: string;

    @Column({ name: 'home_id', type: 'bigint', nullable: false })
    home_id!: string;

    @ManyToOne(() => UserHomeRole, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn([
        { name: 'user_id', referencedColumnName: 'user_id' },
        { name: 'home_id', referencedColumnName: 'home_id' },
    ])
    membership!: UserHomeRole;

    @Column({
        type: 'enum',
        enum: Days,
        enumName: 'days_enum',
    })
    day!: Days;

    @Column({ type: 'time', nullable: false })
    start_time!: string;

    @Column({ type: 'time', nullable: false })
    end_time!: string;

    @Column({ type: 'date', nullable: true })
    start_date?: string;

    @Column({ type: 'date', nullable: true })
    end_date?: string;
}
