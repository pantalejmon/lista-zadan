import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipeCategory1764460800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_recipe" ADD COLUMN "category" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_recipe" DROP COLUMN "category"`);
  }
}
