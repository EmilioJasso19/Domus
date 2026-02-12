import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'homes' })
export class Home {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;
}
