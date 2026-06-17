import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781029994234 implements MigrationInterface {
    name = 'Init1781029994234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "preferences" ("user_id" bigint NOT NULL, "task_id" bigint NOT NULL, "score" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_6f106c91c54cd1652999f595395" PRIMARY KEY ("user_id", "task_id"))`);
        await queryRunner.query(`ALTER TYPE "public"."frequency_type_enum" RENAME TO "frequency_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."frequency_type_enum" AS ENUM('once', 'daily', 'weekly', 'monthly', 'custom')`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "frequency_type" TYPE "public"."frequency_type_enum" USING "frequency_type"::"text"::"public"."frequency_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."frequency_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "preferences" ADD CONSTRAINT "FK_34a542d34f1c75c43e78df2e67a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "preferences" ADD CONSTRAINT "FK_8d9134f6cc45e8d1194393e44ad" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "preferences" DROP CONSTRAINT "FK_8d9134f6cc45e8d1194393e44ad"`);
        await queryRunner.query(`ALTER TABLE "preferences" DROP CONSTRAINT "FK_34a542d34f1c75c43e78df2e67a"`);
        await queryRunner.query(`CREATE TYPE "public"."frequency_type_enum_old" AS ENUM('daily', 'weekly', 'monthly', 'custom')`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "frequency_type" TYPE "public"."frequency_type_enum_old" USING "frequency_type"::"text"::"public"."frequency_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."frequency_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."frequency_type_enum_old" RENAME TO "frequency_type_enum"`);
        await queryRunner.query(`DROP TABLE "preferences"`);
    }

}
