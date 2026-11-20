import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetCodes1789900000000 implements MigrationInterface {
  name = 'AddPasswordResetCodes1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_reset_codes" ("id" BIGSERIAL NOT NULL, "code_hash" character varying(64) NOT NULL, "user_id" bigint NOT NULL, "attempts" integer NOT NULL DEFAULT 0, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_password_reset_codes_user_id" UNIQUE ("user_id"), CONSTRAINT "PK_password_reset_codes" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_codes_expires_at" ON "password_reset_codes" ("expires_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_codes" ADD CONSTRAINT "FK_password_reset_codes_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_codes" DROP CONSTRAINT "FK_password_reset_codes_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_password_reset_codes_expires_at"`);
    await queryRunner.query(`DROP TABLE "password_reset_codes"`);
  }
}
