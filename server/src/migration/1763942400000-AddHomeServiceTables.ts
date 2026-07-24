import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomeServiceTables1763942400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "home_asset" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "location" varchar,
        "installedAt" varchar,
        "warrantyUntil" varchar,
        "model" varchar,
        "serial" varchar,
        "notes" varchar,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_home_asset_household" ON "home_asset" ("householdId")`);

    await queryRunner.query(`
      CREATE TABLE "home_maintenance" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "assetId" varchar NOT NULL,
        "type" varchar NOT NULL,
        "intervalMonths" integer,
        "lastDoneAt" varchar,
        "nextDueAt" varchar,
        "cost" float,
        "notes" varchar,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_home_maintenance_household" ON "home_maintenance" ("householdId")`);
    await queryRunner.query(`CREATE INDEX "idx_home_maintenance_asset" ON "home_maintenance" ("assetId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "home_maintenance"`);
    await queryRunner.query(`DROP TABLE "home_asset"`);
  }
}
