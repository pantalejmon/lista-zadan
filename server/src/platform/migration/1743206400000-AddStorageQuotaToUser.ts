import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStorageQuotaToUser1743206400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'usedStorageBytes',
        type: 'bigint',
        isNullable: false,
        default: 0,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'usedStorageBytes');
  }
}
