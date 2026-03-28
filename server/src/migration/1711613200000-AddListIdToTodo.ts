import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class AddListIdToTodo1711613200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable listId column
    await queryRunner.query(`ALTER TABLE "todo" ADD COLUMN "listId" varchar`);

    // For each user that has todos, create a default list and assign their todos to it
    const usersWithTodos: { userId: string }[] = await queryRunner.query(
      `SELECT DISTINCT "userId" FROM "todo" WHERE "userId" IS NOT NULL`,
    );

    for (const { userId } of usersWithTodos) {
      const listId = randomUUID();
      const now = Date.now();

      await queryRunner.query(
        `INSERT INTO "todo_list" ("id", "name", "ownerId", "isDefault", "createdAt") VALUES (?, ?, ?, 1, ?)`,
        [listId, 'Moja lista', userId, now],
      );

      const memberId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "list_member" ("id", "listId", "userId", "role", "joinedAt") VALUES (?, ?, ?, 'owner', ?)`,
        [memberId, listId, userId, now],
      );

      await queryRunner.query(
        `UPDATE "todo" SET "listId" = ? WHERE "userId" = ?`,
        [listId, userId],
      );
    }

    await queryRunner.query(`CREATE INDEX "IDX_todo_listId" ON "todo" ("listId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_todo_listId"`);
    await queryRunner.query(`ALTER TABLE "todo" DROP COLUMN "listId"`);
  }
}
