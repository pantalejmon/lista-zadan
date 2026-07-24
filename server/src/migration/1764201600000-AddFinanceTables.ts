import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceTables1764201600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "finance_wallet" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "name" varchar NOT NULL,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_finance_wallet_household" ON "finance_wallet" ("householdId")`);

    await queryRunner.query(`
      CREATE TABLE "finance_transaction" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "walletId" varchar NOT NULL,
        "amount" float NOT NULL,
        "description" varchar NOT NULL,
        "category" varchar,
        "occurredAt" bigint NOT NULL,
        "recurringId" varchar,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_finance_tx_household" ON "finance_transaction" ("householdId")`);
    await queryRunner.query(`CREATE INDEX "idx_finance_tx_wallet" ON "finance_transaction" ("walletId")`);

    await queryRunner.query(`
      CREATE TABLE "finance_recurring" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "walletId" varchar NOT NULL,
        "amount" float NOT NULL,
        "description" varchar NOT NULL,
        "category" varchar,
        "frequency" varchar NOT NULL,
        "nextDueAt" varchar NOT NULL,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_finance_rec_household" ON "finance_recurring" ("householdId")`);
    await queryRunner.query(`CREATE INDEX "idx_finance_rec_wallet" ON "finance_recurring" ("walletId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "finance_recurring"`);
    await queryRunner.query(`DROP TABLE "finance_transaction"`);
    await queryRunner.query(`DROP TABLE "finance_wallet"`);
  }
}
