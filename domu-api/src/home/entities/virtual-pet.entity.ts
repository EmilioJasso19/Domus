import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Home } from './home.entity';

@Entity({ name: 'virtual_pet' })
export class VirtualPet {
    @PrimaryColumn({ type: 'bigint' })
    home_id!: string;

    @OneToOne(() => Home, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'home_id' })
    home!: Home;

    @Column({ type: 'varchar', nullable: false })
    name!: string;

    @Column({ type: 'integer', nullable: false, default: 0 })
    level!: number;
}