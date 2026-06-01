import { User } from "@/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'homes' })
export class Home {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id!: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'bigint', nullable: false })
    user_id!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ unique: true, type: 'varchar', length: 6, nullable: false })
    invitation_code!: string;

    @Column({ type: 'bigint', default: 0, unsigned: true })
    points!: number;
}
