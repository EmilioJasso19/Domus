import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1795132519552 implements MigrationInterface {
    name = 'Init1795132519552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`);
        await queryRunner.query(`CREATE TABLE "password_reset_codes" ("id" BIGSERIAL NOT NULL, "code_hash" character varying(64) NOT NULL, "user_id" bigint NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_421ca49f5a7b180365035267ca6" UNIQUE ("user_id"), CONSTRAINT "REL_421ca49f5a7b180365035267ca" UNIQUE ("user_id"), CONSTRAINT "PK_f3a88f7bc4536c53f2b277a0b56" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_password_reset_codes_expires_at" ON "password_reset_codes" ("expires_at") `);
        await queryRunner.query(`ALTER TABLE "task_occurrences" DROP COLUMN "reminder_sent"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_codes" ADD CONSTRAINT "FK_421ca49f5a7b180365035267ca6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_codes" DROP CONSTRAINT "FK_421ca49f5a7b180365035267ca6"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "task_occurrences" ADD "reminder_sent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_codes_expires_at"`);
        await queryRunner.query(`DROP TABLE "password_reset_codes"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
