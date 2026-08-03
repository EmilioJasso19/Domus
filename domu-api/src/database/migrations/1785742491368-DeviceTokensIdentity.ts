import { MigrationInterface, QueryRunner } from 'typeorm';

// Da identidad estable a los dispositivos: device_id pasa a ser la clave real
// (junto con user_id) y el expo_push_token queda como un dato rotativo. Añade
// además la telemetría mínima para poder limpiar dispositivos muertos.
//
// device_id se crea NOT NULL sin default porque la tabla está vacía; si en algún
// entorno hubiera filas, habría que backfillear antes de aplicar el NOT NULL.
export class DeviceTokensIdentity1785742491368 implements MigrationInterface {
  name = 'DeviceTokensIdentity1785742491368';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD "device_id" character varying(64) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD "last_success_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_last_seen_at" ON "device_tokens" ("last_seen_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_user_id" ON "device_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "UQ_device_tokens_user_device" UNIQUE ("user_id", "device_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "UQ_device_tokens_user_device"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_device_tokens_last_seen_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP COLUMN "last_success_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP COLUMN "last_seen_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP COLUMN "device_id"`,
    );
  }
}
