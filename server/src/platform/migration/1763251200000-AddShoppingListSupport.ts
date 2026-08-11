import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShoppingListSupport1763251200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "todo" ADD COLUMN "kind" varchar NOT NULL DEFAULT 'task'`);
    await queryRunner.query(`ALTER TABLE "todo" ADD COLUMN "items" text`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // SQLite drop-column is awkward in older versions; left as no-op for simplicity
  }
}
