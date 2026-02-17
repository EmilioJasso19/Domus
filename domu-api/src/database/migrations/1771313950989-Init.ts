import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1771313950989 implements MigrationInterface {
    name = 'Init1771313950989'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ALTER COLUMN "role_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ALTER COLUMN "role_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
