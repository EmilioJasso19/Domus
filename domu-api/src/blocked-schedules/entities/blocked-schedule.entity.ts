import { Home } from "@/home/entities/home.entity";
import { User } from "@/users/entities/user.entity";
import { ManyToOne, PrimaryGeneratedColumn, Column, Entity } from "typeorm";
import { Days } from "../enums/days.enums";

@Entity({ name: 'blocked_schedules' })
export class BlockedSchedule {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id!: string;

    @ManyToOne(() => User, { nullable: false })
    user!: User;

    @Column({ name: 'user_id', type: 'bigint', nullable: false })
    user_id!: string;

    @ManyToOne(() => Home, { nullable: false })
    home!: Home;

    @Column({ name: 'home_id', type: 'bigint', nullable: false })
    home_id!: string;

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
