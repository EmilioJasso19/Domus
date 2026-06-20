import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781765415724 implements MigrationInterface {
    name = 'Init1781765415724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "virtual_pet" ADD CONSTRAINT "FK_654145286c0b8093ba012ca51a2" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "virtual_pet" DROP CONSTRAINT "FK_654145286c0b8093ba012ca51a2"`);
    }

}
