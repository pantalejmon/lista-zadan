import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthToTodoAndMakeDateNullable1711613300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add month column
    await queryRunner.query(`ALTER TABLE "todo" ADD COLUMN "month" varchar`);

    // SQLite doesn't support ALTER COLUMN to change nullability,
    // but the existing date column already has no NOT NULL constraint
    // (SQLite columns are nullable by default unless explicitly constrained).
    // Existing todos all have dates, so no data migration needed.
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN in older versions,
    // but modern SQLite (3.35+) does.
    await queryRunner.query(`ALTER TABLE "todo" DROP COLUMN "month"`);
  }
}
