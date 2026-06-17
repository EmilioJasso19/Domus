import { Task } from "@/tasks/entities/task.entity";
import { User } from "@/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'preferences' })
export class Preference {

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' } )
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @PrimaryColumn({ type: 'bigint' })
    user_id!: string;

    @ManyToOne(() => Task, { nullable: false, onDelete: 'CASCADE' } )
    @JoinColumn({ name: 'task_id' })
    task!: Task;

    @PrimaryColumn({ type: 'bigint' })
    task_id!: string;

    @Column({ type: 'smallint', default: 0 })
    score!: number;

}
