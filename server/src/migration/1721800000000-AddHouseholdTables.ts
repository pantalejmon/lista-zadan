import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

interface ListRow {
  id: string;
  name: string;
  ownerId: string;
}
interface MemberRow {
  id: string;
  userId: string;
  role: string;
  joinedAt: number;
}
interface InvitationRow {
  id: string;
  listId: string;
  invitedByUserId: string;
  invitedEmail: string;
  role: string;
  status: string;
  createdAt: number;
}

/**
 * Pivots sharing from per-list to per-household without losing data or changing who can access what.
 *
 * Backfill strategy:
 *  - private list (<=1 member)  -> owner's personal household ("Moje gospodarstwo")
 *  - shared  list (>=2 members) -> dedicated household named after the list, members copied 1:1
 * Every list member is (re)added to its target household, and every list is guaranteed a household
 * (fallback creates one for orphaned rows) so nobody loses access.
 */
export class AddHouseholdTables1721800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const now = Date.now();

    // 1. new tables
    await queryRunner.query(`
      CREATE TABLE "household" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "createdAt" bigint NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "household_member" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "role" varchar NOT NULL,
        "joinedAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_household_member_householdId" ON "household_member" ("householdId")`);
    await queryRunner.query(`CREATE INDEX "IDX_household_member_userId" ON "household_member" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_household_member_householdId_userId" ON "household_member" ("householdId", "userId")`);

    await queryRunner.query(`
      CREATE TABLE "household_invitation" (
        "id" varchar PRIMARY KEY NOT NULL,
        "householdId" varchar NOT NULL,
        "invitedByUserId" varchar NOT NULL,
        "invitedEmail" varchar NOT NULL,
        "role" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_household_invitation_householdId" ON "household_invitation" ("householdId")`);
    await queryRunner.query(`CREATE INDEX "IDX_household_invitation_email_status" ON "household_invitation" ("invitedEmail", "status")`);

    // 2. add householdId to todo_list (nullable during backfill)
    await queryRunner.query(`ALTER TABLE "todo_list" ADD COLUMN "householdId" varchar`);

    // 3. backfill — personal households created lazily, one per owner
    const personalByOwner = new Map<string, string>();
    const ensurePersonal = async (ownerId: string): Promise<string> => {
      const cached = personalByOwner.get(ownerId);
      if (cached) {
        return cached;
      }
      const householdId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "household" ("id", "name", "createdAt") VALUES (?, ?, ?)`,
        [householdId, 'Moje gospodarstwo', now],
      );
      await queryRunner.query(
        `INSERT OR IGNORE INTO "household_member" ("id", "householdId", "userId", "role", "joinedAt") VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), householdId, ownerId, 'owner', now],
      );
      personalByOwner.set(ownerId, householdId);
      return householdId;
    };

    const lists: ListRow[] = await queryRunner.query(`SELECT "id", "name", "ownerId" FROM "todo_list"`);
    for (const list of lists) {
      const members: MemberRow[] = await queryRunner.query(
        `SELECT "id", "userId", "role", "joinedAt" FROM "list_member" WHERE "listId" = ?`,
        [list.id],
      );

      let householdId: string;
      if (members.length <= 1) {
        householdId = await ensurePersonal(list.ownerId);
      } else {
        householdId = randomUUID();
        await queryRunner.query(
          `INSERT INTO "household" ("id", "name", "createdAt") VALUES (?, ?, ?)`,
          [householdId, list.name, now],
        );
      }

      // copy every list member into the household; OR IGNORE keeps existing (personal owner) rows
      for (const member of members) {
        await queryRunner.query(
          `INSERT OR IGNORE INTO "household_member" ("id", "householdId", "userId", "role", "joinedAt") VALUES (?, ?, ?, ?, ?)`,
          [randomUUID(), householdId, member.userId, member.role, member.joinedAt],
        );
      }
      // safety net: ensure the owner is a member even if list_member had no owner row
      await queryRunner.query(
        `INSERT OR IGNORE INTO "household_member" ("id", "householdId", "userId", "role", "joinedAt") VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), householdId, list.ownerId, 'owner', now],
      );

      await queryRunner.query(`UPDATE "todo_list" SET "householdId" = ? WHERE "id" = ?`, [householdId, list.id]);
    }

    // 4. migrate pending invitations to their list's household
    const invitations: InvitationRow[] = await queryRunner.query(
      `SELECT "id", "listId", "invitedByUserId", "invitedEmail", "role", "status", "createdAt" FROM "list_invitation" WHERE "status" = 'pending'`,
    );
    for (const inv of invitations) {
      const rows: { householdId: string | null }[] = await queryRunner.query(
        `SELECT "householdId" FROM "todo_list" WHERE "id" = ?`,
        [inv.listId],
      );
      const householdId = rows[0]?.householdId;
      if (!householdId) {
        continue;
      }
      await queryRunner.query(
        `INSERT INTO "household_invitation" ("id", "householdId", "invitedByUserId", "invitedEmail", "role", "status", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [inv.id, householdId, inv.invitedByUserId, inv.invitedEmail, inv.role, inv.status, inv.createdAt],
      );
    }

    // 5. fallback — any list still without a household gets its own (never leave a list homeless)
    const orphans: ListRow[] = await queryRunner.query(
      `SELECT "id", "name", "ownerId" FROM "todo_list" WHERE "householdId" IS NULL`,
    );
    for (const orphan of orphans) {
      const householdId = randomUUID();
      await queryRunner.query(
        `INSERT INTO "household" ("id", "name", "createdAt") VALUES (?, ?, ?)`,
        [householdId, orphan.name || 'Gospodarstwo', now],
      );
      await queryRunner.query(
        `INSERT OR IGNORE INTO "household_member" ("id", "householdId", "userId", "role", "joinedAt") VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), householdId, orphan.ownerId, 'owner', now],
      );
      await queryRunner.query(`UPDATE "todo_list" SET "householdId" = ? WHERE "id" = ?`, [householdId, orphan.id]);
    }

    // 6. rebuild todo_list with NOT NULL householdId (SQLite cannot alter a column to NOT NULL in place)
    await queryRunner.query(`
      CREATE TABLE "todo_list_new" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "ownerId" varchar NOT NULL,
        "householdId" varchar NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT (0),
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "todo_list_new" ("id", "name", "ownerId", "householdId", "isDefault", "createdAt")
      SELECT "id", "name", "ownerId", "householdId", "isDefault", "createdAt" FROM "todo_list"
    `);
    await queryRunner.query(`DROP TABLE "todo_list"`);
    await queryRunner.query(`ALTER TABLE "todo_list_new" RENAME TO "todo_list"`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_list_ownerId" ON "todo_list" ("ownerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_list_householdId" ON "todo_list" ("householdId")`);

    // 7. drop replaced tables
    await queryRunner.query(`DROP TABLE "list_invitation"`);
    await queryRunner.query(`DROP TABLE "list_member"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // recreate per-list tables
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

    // reconstruct list_member: each household member becomes a member of every list in that household
    const lists: { id: string; householdId: string }[] = await queryRunner.query(
      `SELECT "id", "householdId" FROM "todo_list"`,
    );
    for (const list of lists) {
      const members: { userId: string; role: string; joinedAt: number }[] = await queryRunner.query(
        `SELECT "userId", "role", "joinedAt" FROM "household_member" WHERE "householdId" = ?`,
        [list.householdId],
      );
      for (const member of members) {
        await queryRunner.query(
          `INSERT OR IGNORE INTO "list_member" ("id", "listId", "userId", "role", "joinedAt") VALUES (?, ?, ?, ?, ?)`,
          [randomUUID(), list.id, member.userId, member.role, member.joinedAt],
        );
      }
    }

    // reconstruct invitations against the first list of each household
    const invitations: {
      id: string;
      householdId: string;
      invitedByUserId: string;
      invitedEmail: string;
      role: string;
      status: string;
      createdAt: number;
    }[] = await queryRunner.query(
      `SELECT "id", "householdId", "invitedByUserId", "invitedEmail", "role", "status", "createdAt" FROM "household_invitation"`,
    );
    for (const inv of invitations) {
      const rows: { id: string }[] = await queryRunner.query(
        `SELECT "id" FROM "todo_list" WHERE "householdId" = ? LIMIT 1`,
        [inv.householdId],
      );
      const listId = rows[0]?.id;
      if (!listId) {
        continue;
      }
      await queryRunner.query(
        `INSERT INTO "list_invitation" ("id", "listId", "invitedByUserId", "invitedEmail", "role", "status", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [inv.id, listId, inv.invitedByUserId, inv.invitedEmail, inv.role, inv.status, inv.createdAt],
      );
    }

    // drop householdId column (rebuild todo_list without it)
    await queryRunner.query(`
      CREATE TABLE "todo_list_old" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "ownerId" varchar NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT (0),
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "todo_list_old" ("id", "name", "ownerId", "isDefault", "createdAt")
      SELECT "id", "name", "ownerId", "isDefault", "createdAt" FROM "todo_list"
    `);
    await queryRunner.query(`DROP TABLE "todo_list"`);
    await queryRunner.query(`ALTER TABLE "todo_list_old" RENAME TO "todo_list"`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_list_ownerId" ON "todo_list" ("ownerId")`);

    // drop household tables
    await queryRunner.query(`DROP TABLE "household_invitation"`);
    await queryRunner.query(`DROP TABLE "household_member"`);
    await queryRunner.query(`DROP TABLE "household"`);
  }
}
