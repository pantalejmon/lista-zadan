import { MigrationInterface, QueryRunner } from 'typeorm';

// Pochodzenie produktu ('plant' | 'animal'); NULL = nie określono. Potrzebne do
// rozbicia białka na roślinne i zwierzęce w bilansie.
export class AddProductOrigin1765065600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_product" ADD COLUMN "origin" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_product" DROP COLUMN "origin"`);
  }
}
