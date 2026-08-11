import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatTable1763510400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_message" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "text" text NOT NULL,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_chat_message_household" ON "chat_message" ("householdId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_message"`);
  }
}
