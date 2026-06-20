import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781763934081 implements MigrationInterface {
    name = 'Init1781763934081'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "device_tokens" ("id" BIGSERIAL NOT NULL, "expo_push_token" text NOT NULL, "platform" character varying(10) NOT NULL, "user_id" bigint NOT NULL, CONSTRAINT "UQ_f81462ef82a81bf4b7894ff1493" UNIQUE ("expo_push_token"), CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "virtual_pet" ("home_id" bigint NOT NULL, "name" character varying NOT NULL, "level" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_654145286c0b8093ba012ca51a2" PRIMARY KEY ("home_id"))`);
        await queryRunner.query(`CREATE TABLE "task_occurrences" ("id" BIGSERIAL NOT NULL, "due_date" date NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE, "reminder_sent" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "task_id" bigint NOT NULL, "user_id" bigint, CONSTRAINT "PK_0d7e9cf2e3f32f0cfe8f6f788d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_17e1f528b993c6d55def4cf5bea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_occurrences" ADD CONSTRAINT "FK_e6a53a1591a804b96948f950695" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_occurrences" ADD CONSTRAINT "FK_84f30fd3e484504c37cf77ab4bc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_occurrences" DROP CONSTRAINT "FK_84f30fd3e484504c37cf77ab4bc"`);
        await queryRunner.query(`ALTER TABLE "task_occurrences" DROP CONSTRAINT "FK_e6a53a1591a804b96948f950695"`);
        await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_17e1f528b993c6d55def4cf5bea"`);
        await queryRunner.query(`DROP TABLE "task_occurrences"`);
        await queryRunner.query(`DROP TABLE "virtual_pet"`);
        await queryRunner.query(`DROP TABLE "device_tokens"`);
    }

}
