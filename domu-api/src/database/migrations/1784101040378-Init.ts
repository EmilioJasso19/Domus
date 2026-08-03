import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1784101040378 implements MigrationInterface {
  name = 'Init1784101040378';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reminders" ("id" BIGSERIAL NOT NULL, "date_time" TIMESTAMP WITH TIME ZONE NOT NULL, "reminder_sent" boolean NOT NULL DEFAULT false, "occurrence_id" bigint NOT NULL, CONSTRAINT "PK_38715fec7f634b72c6cf7ea4893" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."frequency_type_enum" RENAME TO "frequency_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."frequency_type_enum" AS ENUM('once', 'daily', 'weekly', 'monthly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "frequency_type" TYPE "public"."frequency_type_enum" USING "frequency_type"::"text"::"public"."frequency_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."frequency_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "reminders" ADD CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433" FOREIGN KEY ("occurrence_id") REFERENCES "task_occurrences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reminders" DROP CONSTRAINT "FK_cb6709a939ba5d7080a6d4cc433"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."frequency_type_enum_old" AS ENUM('once', 'daily', 'weekly', 'monthly', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "frequency_type" TYPE "public"."frequency_type_enum_old" USING "frequency_type"::"text"::"public"."frequency_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."frequency_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."frequency_type_enum_old" RENAME TO "frequency_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "reminders"`);
  }
}
