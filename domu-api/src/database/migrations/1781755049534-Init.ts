import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781755049534 implements MigrationInterface {
    name = 'Init1781755049534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "responsible_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "due_date"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_completed"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "completed_at"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "physical_effort" integer NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "physical_effort"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "completed_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "is_completed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "due_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "responsible_id" bigint`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
