import { MigrationInterface, QueryRunner } from 'typeorm';

// Wpis planera może odtąd być posiłkiem doraźnym: `recipeId` staje się nullable,
// dochodzą `customTitle` i `customIngredients`.
//
// SQLite nie umie `ALTER COLUMN`, więc tabela jest przebudowywana: nowa tabela →
// przepisanie danych → podmiana. Kolumny wymieniamy **jawnie** (zamiast `SELECT *`),
// żeby zmiana kolejności czy dołożenie pola w przyszłości nie przestawiło wartości.
export class AllowAdHocMealEntry1764892800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meal_entry_new" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "weekStart" varchar NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "mealType" varchar NOT NULL,
        "recipeId" varchar,
        "customTitle" varchar,
        "customIngredients" text,
        "cooked" boolean NOT NULL DEFAULT (0),
        "participants" text,
        "portionScale" float NOT NULL DEFAULT (1),
        "ingredientOverrides" text
      )
    `);
    await queryRunner.query(`
      INSERT INTO "meal_entry_new"
        ("id", "householdId", "weekStart", "dayOfWeek", "mealType", "recipeId",
         "cooked", "participants", "portionScale", "ingredientOverrides")
      SELECT "id", "householdId", "weekStart", "dayOfWeek", "mealType", "recipeId",
             "cooked", "participants", "portionScale", "ingredientOverrides"
      FROM "meal_entry"
    `);
    await queryRunner.query(`DROP TABLE "meal_entry"`);
    await queryRunner.query(`ALTER TABLE "meal_entry_new" RENAME TO "meal_entry"`);
    await queryRunner.query(`CREATE INDEX "IDX_meal_entry_householdId" ON "meal_entry" ("householdId")`);
  }

  // Powrót gubi posiłki doraźne — nie da się ich zapisać w schemacie, który wymaga
  // przepisu. Kasujemy je świadomie, zamiast wywalać migrację na NOT NULL.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "meal_entry" WHERE "recipeId" IS NULL`);
    await queryRunner.query(`
      CREATE TABLE "meal_entry_old" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "weekStart" varchar NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "mealType" varchar NOT NULL,
        "recipeId" varchar NOT NULL,
        "cooked" boolean NOT NULL DEFAULT (0),
        "participants" text,
        "portionScale" float NOT NULL DEFAULT (1),
        "ingredientOverrides" text
      )
    `);
    await queryRunner.query(`
      INSERT INTO "meal_entry_old"
        ("id", "householdId", "weekStart", "dayOfWeek", "mealType", "recipeId",
         "cooked", "participants", "portionScale", "ingredientOverrides")
      SELECT "id", "householdId", "weekStart", "dayOfWeek", "mealType", "recipeId",
             "cooked", "participants", "portionScale", "ingredientOverrides"
      FROM "meal_entry"
    `);
    await queryRunner.query(`DROP TABLE "meal_entry"`);
    await queryRunner.query(`ALTER TABLE "meal_entry_old" RENAME TO "meal_entry"`);
    await queryRunner.query(`CREATE INDEX "IDX_meal_entry_householdId" ON "meal_entry" ("householdId")`);
  }
}
