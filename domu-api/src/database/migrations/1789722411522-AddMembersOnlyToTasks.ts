import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembersOnlyToTasks1789722411522 implements MigrationInterface {
  name = 'AddMembersOnlyToTasks1789722411522';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "members_only" boolean NOT NULL DEFAULT true`,
    );
    // Backfill: toda fila existente al correr esta migración es anterior a la
    // funcionalidad y fue creada "para todos". Las tareas nuevas nacen en true.
    await queryRunner.query(`UPDATE "tasks" SET "members_only" = false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "members_only"`);
  }
}
