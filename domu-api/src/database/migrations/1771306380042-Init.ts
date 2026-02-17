import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1771306380042 implements MigrationInterface {
    name = 'Init1771306380042'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" BIGSERIAL NOT NULL, "name" character varying(30) NOT NULL, "description" text, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_home_roles" ("user_id" bigint NOT NULL, "home_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "role_id" bigint, CONSTRAINT "PK_19bfeedb78f8f20537e1550dfa9" PRIMARY KEY ("user_id", "home_id"))`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "completed_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_c99b061780f09df680b190d69a4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_5e329a738113ffbf05097132e36" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_5e329a738113ffbf05097132e36"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_c99b061780f09df680b190d69a4"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "completed_at"`);
        await queryRunner.query(`DROP TABLE "user_home_roles"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
