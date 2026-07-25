import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsToUser1764288000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Per-user appearance preferences, stored as JSON (theme/accent/fontSize).
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "settings" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "settings"`);
  }
}
