import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptionTable1763596800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscription" (
        "id" varchar PRIMARY KEY NOT NULL,
        "userId" varchar NOT NULL,
        "endpoint" varchar NOT NULL,
        "p256dh" varchar NOT NULL,
        "auth" varchar NOT NULL,
        "userAgent" varchar,
        "createdAt" bigint NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_push_subscription_endpoint" ON "push_subscription" ("endpoint")`);
    await queryRunner.query(`CREATE INDEX "idx_push_subscription_user" ON "push_subscription" ("userId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "push_subscription"`);
  }
}
