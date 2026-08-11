import { MigrationInterface, QueryRunner } from 'typeorm';

// Dzienne cele odżywcze domowników — per gospodarstwo, nie per konto.
export class AddNutritionGoalTable1764979200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meal_nutrition_goal" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "kcal" float NOT NULL,
        "protein" float NOT NULL,
        "fat" float NOT NULL,
        "carbs" float NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_meal_nutrition_goal_householdId" ON "meal_nutrition_goal" ("householdId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meal_nutrition_goal"`);
  }
}
