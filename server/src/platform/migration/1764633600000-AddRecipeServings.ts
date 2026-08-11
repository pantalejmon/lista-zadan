import { MigrationInterface, QueryRunner } from 'typeorm';

// Liczba porcji przepisu — dzielnik dla wartości odżywczych „na porcję".
// Istniejące przepisy dostają 1, czyli „makro całości = makro porcji".
export class AddRecipeServings1764633600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_recipe" ADD COLUMN "servings" integer NOT NULL DEFAULT 1`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_recipe" DROP COLUMN "servings"`);
  }
}
