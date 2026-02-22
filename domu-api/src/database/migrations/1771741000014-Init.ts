import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1771741000014 implements MigrationInterface {
    name = 'Init1771741000014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_db55af84c226af9dce09487b61b"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "user_id" TO "responsible_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "responsible_id" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_db55af84c226af9dce09487b61b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
