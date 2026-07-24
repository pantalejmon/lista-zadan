import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMealTables1763424000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meal_recipe" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "title" varchar NOT NULL,
        "description" varchar,
        "instructions" text NOT NULL,
        "ingredients" text,
        "createdAt" bigint NOT NULL,
        "updatedAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_meal_recipe_household" ON "meal_recipe" ("householdId")`);

    await queryRunner.query(`
      CREATE TABLE "meal_entry" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "weekStart" varchar NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "mealType" varchar NOT NULL,
        "recipeId" varchar NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_meal_entry_household" ON "meal_entry" ("householdId")`);

    await queryRunner.query(`
      CREATE TABLE "meal_shopping_item" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "quantity" float,
        "unit" varchar,
        "isChecked" boolean NOT NULL DEFAULT (0),
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_meal_shopping_household" ON "meal_shopping_item" ("householdId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meal_shopping_item"`);
    await queryRunner.query(`DROP TABLE "meal_entry"`);
    await queryRunner.query(`DROP TABLE "meal_recipe"`);
  }
}
