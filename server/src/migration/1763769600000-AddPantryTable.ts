import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPantryTable1763769600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meal_pantry_item" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "productId" varchar NOT NULL,
        "quantity" float NOT NULL DEFAULT (0)
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_meal_pantry_household" ON "meal_pantry_item" ("householdId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meal_pantry_item"`);
  }
}
