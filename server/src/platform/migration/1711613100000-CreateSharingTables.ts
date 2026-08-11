import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharingTables1711613100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "todo_list" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "ownerId" varchar NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT (0),
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_todo_list_ownerId" ON "todo_list" ("ownerId")`);

    await queryRunner.query(`
      CREATE TABLE "list_member" (
        "id" varchar PRIMARY KEY NOT NULL,
        "listId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "role" varchar NOT NULL,
        "joinedAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_list_member_listId" ON "list_member" ("listId")`);
    await queryRunner.query(`CREATE INDEX "IDX_list_member_userId" ON "list_member" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_list_member_listId_userId" ON "list_member" ("listId", "userId")`);

    await queryRunner.query(`
      CREATE TABLE "list_invitation" (
        "id" varchar PRIMARY KEY NOT NULL,
        "listId" varchar NOT NULL,
        "invitedByUserId" varchar NOT NULL,
        "invitedEmail" varchar NOT NULL,
        "role" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_list_invitation_listId" ON "list_invitation" ("listId")`);
    await queryRunner.query(`CREATE INDEX "IDX_list_invitation_email_status" ON "list_invitation" ("invitedEmail", "status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "list_invitation"`);
    await queryRunner.query(`DROP TABLE "list_member"`);
    await queryRunner.query(`DROP TABLE "todo_list"`);
  }
}
