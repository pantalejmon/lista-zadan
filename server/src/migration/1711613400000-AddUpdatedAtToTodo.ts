import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtToTodo1711613400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "todo" ADD COLUMN "updatedAt" bigint`);
    await queryRunner.query(`UPDATE "todo" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN directly in older versions,
    // but since we're only adding, the reverse is a no-op for simplicity
  }
}
