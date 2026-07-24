import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiTokenTable1764028800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_token" (
        "id" varchar PRIMARY KEY NOT NULL,
        "userId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "tokenHash" varchar NOT NULL,
        "scopes" varchar NOT NULL,
        "householdId" varchar,
        "createdAt" bigint NOT NULL,
        "expiresAt" bigint,
        "lastUsedAt" bigint,
        "revokedAt" bigint
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_api_token_user" ON "api_token" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_api_token_hash" ON "api_token" ("tokenHash")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "api_token"`);
  }
}
