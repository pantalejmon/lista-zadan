import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const KNOWN_UNITS = new Set(['g', 'ml', 'szt']);

interface RecipeRow {
  householdId: string;
  ingredients: string | null;
}

interface RawIngredient {
  name?: unknown;
  unit?: unknown;
}

export class AddProductTable1763683200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meal_product" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "category" varchar,
        "baseUnit" varchar NOT NULL DEFAULT ('szt'),
        "packageSize" float,
        "trackInPantry" boolean NOT NULL DEFAULT (1)
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_meal_product_household" ON "meal_product" ("householdId")`);

    // Backfill: create a product for each distinct ingredient name already used in recipes
    // (per household). Recipes are NOT modified — pantry/shopping matching is name-based.
    const recipes = (await queryRunner.query(
      `SELECT "householdId", "ingredients" FROM "meal_recipe"`,
    )) as RecipeRow[];

    const seen = new Set<string>();
    for (const recipe of recipes) {
      if (!recipe.ingredients) {
        continue;
      }
      let parsed: RawIngredient[];
      try {
        const raw = JSON.parse(recipe.ingredients) as unknown;
        parsed = Array.isArray(raw) ? (raw as RawIngredient[]) : [];
      } catch {
        continue;
      }
      for (const ing of parsed) {
        const name = typeof ing.name === 'string' ? ing.name.trim() : '';
        if (!name) {
          continue;
        }
        const key = `${recipe.householdId}__${name.toLowerCase()}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        const unit = typeof ing.unit === 'string' ? ing.unit.trim() : '';
        const baseUnit = KNOWN_UNITS.has(unit) ? unit : 'szt';
        await queryRunner.query(
          `INSERT INTO "meal_product" ("id","householdId","name","category","baseUnit","packageSize","trackInPantry")
           VALUES (?,?,?,?,?,?,?)`,
          [randomUUID(), recipe.householdId, name, null, baseUnit, null, 1],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "meal_product"`);
  }
}
