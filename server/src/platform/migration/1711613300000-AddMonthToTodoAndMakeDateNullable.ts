import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthToTodoAndMakeDateNullable1711613300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support ALTER COLUMN, so we recreate the table
    // to make "date" nullable and add the "month" column.
    await queryRunner.query(`
      CREATE TABLE "todo_tmp" (
        "id" varchar PRIMARY KEY NOT NULL,
        "text" varchar NOT NULL,
        "completed" boolean NOT NULL DEFAULT (false),
        "date" varchar,
        "time" varchar,
        "createdAt" bigint NOT NULL,
        "recurrenceGroupId" varchar,
        "userId" varchar,
        "listId" varchar,
        "month" varchar
      )
    `);

    await queryRunner.query(`
      INSERT INTO "todo_tmp" ("id", "text", "completed", "date", "time", "createdAt", "recurrenceGroupId", "userId", "listId")
      SELECT "id", "text", "completed", "date", "time", "createdAt", "recurrenceGroupId", "userId", "listId"
      FROM "todo"
    `);

    await queryRunner.query(`DROP TABLE "todo"`);
    await queryRunner.query(`ALTER TABLE "todo_tmp" RENAME TO "todo"`);

    // Recreate indexes
    await queryRunner.query(`CREATE INDEX "IDX_todo_recurrenceGroupId" ON "todo" ("recurrenceGroupId")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_date" ON "todo" ("date")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_userId" ON "todo" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_listId" ON "todo" ("listId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "todo" DROP COLUMN "month"`);
  }
}
