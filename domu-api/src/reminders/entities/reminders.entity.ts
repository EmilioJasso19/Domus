import { TaskOccurrence } from "@/task-occurrences/entities/task-occurrence.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'reminders' })
export class Reminder {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id!: number;

    @ManyToOne(() => TaskOccurrence, { nullable: false })
    @JoinColumn({ name: 'occurrence_id' })
    occurrence!: TaskOccurrence;

    @Column({ type: 'timestamptz', nullable: false })
    date_time!: Date;

    @Column({ type: 'boolean', nullable: false, default: false })
    reminder_sent!: boolean;
}