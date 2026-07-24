import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCookedToMealEntry1763856000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" ADD COLUMN "cooked" boolean NOT NULL DEFAULT (0)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" DROP COLUMN "cooked"`);
  }
}
