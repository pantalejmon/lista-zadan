import { MigrationInterface, QueryRunner } from 'typeorm';

// Wartości odżywcze produktu: na 100 g / 100 ml, a dla `baseUnit = szt` na 1 sztukę.
// Wszystkie kolumny nullable — istniejący słownik zostaje bez makro.
export class AddProductNutrition1764547200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "kcal" float`);
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "protein" float`);
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "fat" float`);
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "carbs" float`);
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "fiber" float`);
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "salt" float`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "salt"`);
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "fiber"`);
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "carbs"`);
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "fat"`);
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "protein"`);
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "kcal"`);
  }
}
