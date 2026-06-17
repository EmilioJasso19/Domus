import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781027540867 implements MigrationInterface {
    name = 'Init1781027540867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "homes" DROP CONSTRAINT "FK_4911430f572de50494de5ba7ca1"`);
        await queryRunner.query(`ALTER TABLE "homes" RENAME COLUMN "user_id" TO "created_by"`);
        await queryRunner.query(`ALTER TABLE "homes" ADD CONSTRAINT "FK_63e4f17f43dc51b85c856922a0e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "homes" DROP CONSTRAINT "FK_63e4f17f43dc51b85c856922a0e"`);
        await queryRunner.query(`ALTER TABLE "homes" RENAME COLUMN "created_by" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "homes" ADD CONSTRAINT "FK_4911430f572de50494de5ba7ca1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
