import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781819476029 implements MigrationInterface {
    name = 'Init1781819476029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_occurrences" ADD "due_time" TIME`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_occurrences" DROP COLUMN "due_time"`);
    }

}
