import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeleteToReminders1787644505777 implements MigrationInterface {
  name = 'AddCascadeDeleteToReminders1787644505777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reminders" DROP CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_occurrences" DROP COLUMN "reminder_sent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reminders" ADD CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433" FOREIGN KEY ("occurrence_id") REFERENCES "task_occurrences"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reminders" DROP CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_occurrences" ADD "reminder_sent" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "reminders" ADD CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433" FOREIGN KEY ("occurrence_id") REFERENCES "task_occurrences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
