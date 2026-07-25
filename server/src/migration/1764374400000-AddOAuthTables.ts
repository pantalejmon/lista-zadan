import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthTables1764374400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "oauth_client" (
        "clientId" varchar PRIMARY KEY NOT NULL,
        "clientName" varchar NOT NULL,
        "redirectUris" varchar NOT NULL,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "oauth_auth_code" (
        "codeHash" varchar PRIMARY KEY NOT NULL,
        "clientId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "redirectUri" varchar NOT NULL,
        "codeChallenge" varchar NOT NULL,
        "scopes" varchar NOT NULL,
        "resource" varchar,
        "expiresAt" bigint NOT NULL,
        "consumedAt" bigint
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_oauth_auth_code_client" ON "oauth_auth_code" ("clientId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oauth_auth_code"`);
    await queryRunner.query(`DROP TABLE "oauth_client"`);
  }
}
