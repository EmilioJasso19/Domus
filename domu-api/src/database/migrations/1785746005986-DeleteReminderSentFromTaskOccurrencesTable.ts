import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteReminderSentFromTaskOccurrencesTable1785746005986 implements MigrationInterface {
    name = 'DeleteReminderSentFromTaskOccurrencesTable1785746005986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_occurrences" DROP COLUMN "reminder_sent"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_occurrences" ADD "reminder_sent" boolean NOT NULL DEFAULT false`);
    }

}
