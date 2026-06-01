import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1780284690193 implements MigrationInterface {
    name = 'Init1780284690193'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_strict"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "evidence_path"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "home_id" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_122bb975dc2cdbed498278cd347" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_122bb975dc2cdbed498278cd347"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "home_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "evidence_path" text`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "is_strict" boolean NOT NULL DEFAULT false`);
    }

}
