import { MigrationInterface, QueryRunner } from 'typeorm';

// Korekty przepisu w slocie planera: mnożnik porcji i bezwzględne nadpisania
// ilości składników (JSON). Istniejące wpisy dostają 1 i pustą listę, czyli
// „dokładnie tak, jak w przepisie".
export class AddMealEntryOverrides1764806400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" ADD COLUMN "portionScale" float NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "meal_entry" ADD COLUMN "ingredientOverrides" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" DROP COLUMN "ingredientOverrides"`);
    await queryRunner.query(`ALTER TABLE "meal_entry" DROP COLUMN "portionScale"`);
  }
}
