import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomeProvidersRenovations1764115200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "home_provider" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "trade" varchar,
        "phone" varchar,
        "email" varchar,
        "notes" varchar,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_home_provider_household" ON "home_provider" ("householdId")`);

    await queryRunner.query(`
      CREATE TABLE "home_renovation" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "title" varchar NOT NULL,
        "status" varchar NOT NULL,
        "description" text,
        "budget" float,
        "cost" float,
        "checklist" text NOT NULL DEFAULT ('[]'),
        "createdAt" bigint NOT NULL,
        "updatedAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_home_renovation_household" ON "home_renovation" ("householdId")`);

    await queryRunner.query(`ALTER TABLE "home_maintenance" ADD COLUMN "providerId" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "home_maintenance" DROP COLUMN "providerId"`);
    await queryRunner.query(`DROP TABLE "home_renovation"`);
    await queryRunner.query(`DROP TABLE "home_provider"`);
  }
}
