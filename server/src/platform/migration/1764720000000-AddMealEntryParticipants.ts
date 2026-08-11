import { MigrationInterface, QueryRunner } from 'typeorm';

// Kto je dany posiłek i w ilu porcjach (JSON: [{userId, portions}]).
// Istniejące wpisy zostają bez uczestników — czyli „nieprzypisane", poza bilansem.
export class AddMealEntryParticipants1764720000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" ADD COLUMN "participants" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_entry" DROP COLUMN "participants"`);
  }
}
