import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'roles' })
export class Role {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    // NOTE: just member, owner, guest
    @Column({ type: 'varchar', length: 30, unique: true, nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;
}
