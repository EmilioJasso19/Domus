import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1771293835390 implements MigrationInterface {
    name = 'Init1771293835390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0dcc79849cdc111396fde42c8c3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."roles_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "home_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "home_id" bigint`);
        await queryRunner.query(`CREATE TYPE "public"."roles_enum" AS ENUM('owner', 'member', 'guest')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."roles_enum" NOT NULL DEFAULT 'guest'`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_0dcc79849cdc111396fde42c8c3" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
