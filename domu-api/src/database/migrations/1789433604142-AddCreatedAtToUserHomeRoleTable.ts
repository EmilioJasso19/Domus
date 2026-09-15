import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToUserHomeRoleTable1789433604142 implements MigrationInterface {
  name = 'AddCreatedAtToUserHomeRoleTable1789433604142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_home_roles" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_home_roles" DROP COLUMN "created_at"`,
    );
  }
}
