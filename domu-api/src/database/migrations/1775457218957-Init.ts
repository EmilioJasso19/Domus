import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775457218957 implements MigrationInterface {
    name = 'Init1775457218957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, "paternal_surname" character varying(100) NOT NULL, "maternal_surname" character varying(100), "email" character varying(255) NOT NULL, "password" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."frequency_type_enum" AS ENUM('daily', 'weekly', 'monthly', 'custom')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" BIGSERIAL NOT NULL, "responsible_id" bigint, "name" character varying(100) NOT NULL, "description" text, "due_date" date NOT NULL, "frequency_type" "public"."frequency_type_enum" NOT NULL, "is_completed" boolean NOT NULL DEFAULT false, "completed_at" TIMESTAMP WITH TIME ZONE, "is_strict" boolean NOT NULL DEFAULT false, "evidence_path" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "homes" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "PK_a85aa6f2e56424fc745effdd5f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" BIGSERIAL NOT NULL, "name" character varying(30) NOT NULL, "description" text, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_home_roles" ("user_id" bigint NOT NULL, "home_id" bigint NOT NULL, "role_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_19bfeedb78f8f20537e1550dfa9" PRIMARY KEY ("user_id", "home_id"))`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_c99b061780f09df680b190d69a4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_5e329a738113ffbf05097132e36" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" ADD CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_bce1e927ed075acf8e2f7b788df"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_5e329a738113ffbf05097132e36"`);
        await queryRunner.query(`ALTER TABLE "user_home_roles" DROP CONSTRAINT "FK_c99b061780f09df680b190d69a4"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_bfb47e71ef6c93aebeedf07f28c"`);
        await queryRunner.query(`DROP TABLE "user_home_roles"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "homes"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."frequency_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
